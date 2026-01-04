import type { Block, ToolCall, TextBlock, ToolCallBlock } from "./types"
import { getLlmHost } from "~/lib/env"

type Message = {
  role: "system" | "user" | "assistant" | "tool"
  content?: string
  tool_call_id?: string
  tool_calls?: Array<{
    id: string
    type: "function"
    function: { name: string; arguments: string }
  }>
}

type ToolCallAccumulator = {
  id: string
  name: string
  arguments: string
}

type ParseCallbacks = {
  onChunk?: (text: string) => void
  onBlock?: (block: Block) => void
}

type OpenAIDelta = {
  content?: string | null
  tool_calls?: Array<{
    index: number
    id?: string
    function?: {
      name?: string
      arguments?: string
    }
  }>
}

type OpenAIChoice = {
  delta: OpenAIDelta
  finish_reason: string | null
}

type OpenAIChunk = {
  choices?: OpenAIChoice[]
}

const parseToolArgs = (args: string): Record<string, unknown> => {
  try {
    return JSON.parse(args) as Record<string, unknown>
  } catch {
    return {}
  }
}

const accumulatorToToolCall = (acc: ToolCallAccumulator): ToolCall => ({
  id: acc.id,
  name: acc.name,
  args: parseToolArgs(acc.arguments),
})

type ParseState = {
  textContent: string
  toolCallAccs: Map<number, ToolCallAccumulator>
  toolCalls: ToolCall[]
}

export const initialParseState = (): ParseState => ({
  textContent: "",
  toolCallAccs: new Map(),
  toolCalls: [],
})

const finalizeAccumulators = (state: ParseState): ParseState => {
  if (state.toolCallAccs.size === 0) return state
  const finalized = Array.from(state.toolCallAccs.values()).map(accumulatorToToolCall)
  return {
    ...state,
    toolCalls: [...state.toolCalls, ...finalized],
    toolCallAccs: new Map(),
  }
}

export const processLine = (
  line: string,
  state: ParseState,
  callbacks: ParseCallbacks
): ParseState => {
  if (!line.startsWith("data: ")) return state

  const data = line.slice(6)
  if (data === "[DONE]") {
    return finalizeAccumulators(state)
  }

  try {
    const chunk: OpenAIChunk = JSON.parse(data)
    const choice = chunk.choices?.[0]
    if (!choice) return state

    if (choice.finish_reason === "tool_calls") {
      return finalizeAccumulators(state)
    }

    const delta = choice.delta
    if (!delta) return state

    if (delta.content) {
      callbacks.onChunk?.(delta.content)
      return { ...state, textContent: state.textContent + delta.content }
    }

    if (delta.tool_calls) {
      let newAccs = state.toolCallAccs
      for (const tc of delta.tool_calls) {
        const idx = tc.index
        const existing = newAccs.get(idx)

        if (tc.id) {
          newAccs = new Map(newAccs)
          newAccs.set(idx, {
            id: tc.id,
            name: tc.function?.name ?? "",
            arguments: tc.function?.arguments ?? "",
          })
        } else if (existing && tc.function?.arguments) {
          newAccs = new Map(newAccs)
          newAccs.set(idx, {
            ...existing,
            arguments: existing.arguments + tc.function.arguments,
          })
        }
      }
      return { ...state, toolCallAccs: newAccs }
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
  messages: Message[]
  callbacks?: ParseCallbacks
  signal?: AbortSignal
}

export const parse = async (options: ParseOptions): Promise<Block[]> => {
  const { endpoint, messages, callbacks = {}, signal } = options
  const url = `${getLlmHost()}${endpoint}`

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  })

  if (!response.ok) {
    throw new Error(`LLM request failed: ${response.status}`)
  }

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

const blockToMessage = (block: Block): Message | Message[] => {
  if (block.type === "system") {
    return { role: "system", content: block.content }
  }
  if (block.type === "text") {
    return { role: "assistant", content: block.content }
  }
  if (block.type === "user") {
    return { role: "user", content: block.content }
  }
  if (block.type === "tool_call") {
    return {
      role: "assistant",
      tool_calls: block.calls.map((c) => ({
        id: c.id,
        type: "function" as const,
        function: { name: c.name, arguments: JSON.stringify(c.args) },
      })),
    }
  }
  if (block.type === "tool_result") {
    return {
      role: "tool",
      tool_call_id: block.callId,
      content: JSON.stringify(block.result),
    }
  }
  return []
}

export const blocksToMessages = (blocks: Block[]): Message[] =>
  blocks.flatMap(blockToMessage)

export type { Message, ParseCallbacks }
