import type { Block, ToolCall } from "./types"
import { getLlmHost } from "~/lib/env"
import { calculateBackoff } from "~/lib/backoff"

type InputItem =
  | { type: "message"; role: "system" | "user" | "assistant"; content: string }
  | { type: "function_call"; call_id: string; status: string; name: string; arguments: string }
  | { type: "function_call_output"; call_id: string; status: string; output: string }
  | { type: "apply_patch_call"; call_id: string; status: string; operation: { type: string; path: string; diff: string } }
  | { type: "apply_patch_call_output"; call_id: string; status: string; output: string }

type ParseCallbacks = {
  onChunk?: (text: string) => void
  onBlock?: (block: Block) => void
}

const parseToolArgs = (args: string): Record<string, unknown> => {
  try {
    return JSON.parse(args) as Record<string, unknown>
  } catch {
    return {}
  }
}

type ParseState = {
  currentEvent: string
  textContent: string
  toolCalls: ToolCall[]
}

export const initialParseState = (): ParseState => ({
  currentEvent: "",
  textContent: "",
  toolCalls: [],
})

export const processLine = (
  line: string,
  state: ParseState,
  callbacks: ParseCallbacks
): ParseState => {
  if (line.startsWith("event: ")) {
    return { ...state, currentEvent: line.slice(7) }
  }

  if (!line.startsWith("data: ")) return state

  const data = line.slice(6)

  try {
    const parsed = JSON.parse(data)

    if (state.currentEvent === "response.output_text.delta") {
      if (parsed.delta) {
        callbacks.onChunk?.(parsed.delta)
        return { ...state, textContent: state.textContent + parsed.delta }
      }
    }

    if (state.currentEvent === "response.output_item.done" && parsed.item) {
      const item = parsed.item
      if (item.type === "function_call") {
        const toolCall: ToolCall = {
          id: item.call_id,
          name: item.name,
          args: parseToolArgs(item.arguments),
        }
        return { ...state, toolCalls: [...state.toolCalls, toolCall] }
      }
      if (item.type === "apply_patch_call") {
        const toolCall: ToolCall = {
          id: item.call_id,
          name: "apply_patch",
          args: {
            operation: {
              type: item.operation.type,
              path: item.operation.path,
              diff: item.operation.diff,
            },
          },
        }
        return { ...state, toolCalls: [...state.toolCalls, toolCall] }
      }
    }

    return state
  } catch {
    return state
  }
}

const stateToBlocks = (state: ParseState): Block[] => {
  const blocks: Block[] = []
  if (state.textContent) {
    blocks.push({ type: "text", content: state.textContent })
  }
  if (state.toolCalls.length > 0) {
    blocks.push({ type: "tool_call", calls: state.toolCalls })
  }
  return blocks
}

export type ParseOptions = {
  endpoint: string
  messages: InputItem[]
  callbacks?: ParseCallbacks
  signal?: AbortSignal
}

const RETRYABLE_STATUS = [429, 502, 503]
const MAX_RETRIES = 3

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const isRetryable = (status: number): boolean => RETRYABLE_STATUS.includes(status)

type FetchOptions = {
  url: string
  body: string
  signal?: AbortSignal
}

const fetchWithRetry = async ({ url, body, signal }: FetchOptions): Promise<Response> => {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal,
    })

    if (response.ok) return response

    if (!isRetryable(response.status) || attempt === MAX_RETRIES) {
      throw new Error(`LLM request failed: ${response.status}`)
    }

    const delay = calculateBackoff(attempt, { maxDelay: 10000 })
    await sleep(delay)
  }

  throw new Error("LLM request failed: max retries exceeded")
}

export const parse = async (options: ParseOptions): Promise<Block[]> => {
  const { endpoint, messages, callbacks = {}, signal } = options
  const url = `${getLlmHost()}${endpoint}`

  const response = await fetchWithRetry({
    url,
    body: JSON.stringify({ messages }),
    signal,
  })

  if (!response.body) {
    throw new Error("No response body")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let state = initialParseState()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""

      for (const line of lines) {
        if (!line.trim()) continue
        state = processLine(line, state, callbacks)
      }
    }

    if (buffer.trim()) {
      state = processLine(buffer, state, callbacks)
    }
  } finally {
    reader.releaseLock()
  }

  const blocks = stateToBlocks(state)
  for (const block of blocks) {
    callbacks.onBlock?.(block)
  }
  return blocks
}

const blockToInputItem = (block: Block): InputItem | InputItem[] => {
  if (block.type === "system") {
    return { type: "message", role: "system", content: block.content }
  }
  if (block.type === "text") {
    return { type: "message", role: "assistant", content: block.content }
  }
  if (block.type === "user") {
    return { type: "message", role: "user", content: block.content }
  }
  if (block.type === "tool_call") {
    return block.calls.map((c) => {
      if (c.name === "apply_patch") {
        const op = c.args.operation as { type: string; path: string; diff: string }
        return {
          type: "apply_patch_call" as const,
          call_id: c.id,
          status: "completed",
          operation: { type: op.type, path: op.path, diff: op.diff },
        }
      }
      return {
        type: "function_call" as const,
        call_id: c.id,
        status: "completed",
        name: c.name,
        arguments: JSON.stringify(c.args),
      }
    })
  }
  if (block.type === "tool_result") {
    if (block.toolName === "apply_patch") {
      return {
        type: "apply_patch_call_output" as const,
        call_id: block.callId,
        status: "completed",
        output: JSON.stringify(block.result),
      }
    }
    return {
      type: "function_call_output",
      call_id: block.callId,
      status: "completed",
      output: JSON.stringify(block.result),
    }
  }
  return []
}

export const blocksToMessages = (blocks: Block[]): InputItem[] =>
  blocks.flatMap(blockToInputItem)

export type { InputItem, ParseCallbacks }
