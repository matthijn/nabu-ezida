import type { Block } from "./blocks"
import type { ToolDefinition } from "../executors/tool"
import type { BlockSchemaDefinition } from "~/lib/data-blocks/json-schema"
import { getLlmHost } from "~/lib/agent/env"
import { calculateBackoff } from "~/lib/utils/backoff"
import { initialParseState, processLine, stateToBlocks, type ParseCallbacks } from "./parse"
import type { InputItem, ResponseFormat } from "./convert"

const RETRYABLE_STATUS = [429, 502, 503]
const MAX_RETRIES = 3

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const isRetryable = (status: number): boolean => RETRYABLE_STATUS.includes(status)

interface FetchOptions {
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

const streamToBlocks = async (response: Response, callbacks: ParseCallbacks): Promise<Block[]> => {
  if (!response.body) {
    throw new Error("No response body")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let state = initialParseState()
  let firstBytesLogged = false

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      if (!firstBytesLogged) {
        console.log("[LLM] First bytes received", performance.now().toFixed(0) + "ms")
        firstBytesLogged = true
      }

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
    await reader.cancel()
    reader.releaseLock()
  }

  const blocks = stateToBlocks(state)
  for (const block of blocks) {
    callbacks.onBlock?.(block)
  }
  callbacks.onStreamEnd?.()

  console.debug("[STREAM END]", {
    pendingToolCalls: state.pendingToolCalls.length,
    blocks: blocks.length,
  })

  return blocks
}

interface CallLlmOptions {
  endpoint: string
  messages: InputItem[]
  tools?: ToolDefinition[]
  blockSchemas?: BlockSchemaDefinition[]
  responseFormat?: ResponseFormat
  callbacks?: ParseCallbacks
  signal?: AbortSignal
}

const formatBlockSchema = (s: BlockSchemaDefinition): string => {
  const traits = [s.singleton ? "singleton" : "multiple"]
  if (s.immutable.length > 0) traits.push(`immutable: ${s.immutable.join(", ")}`)
  const header = `### ${s.language} (${traits.join("; ")})`
  const schema = JSON.stringify(s.jsonSchema, null, 2)
  const constraints =
    s.constraints.length > 0
      ? `\nConstraints:\n${s.constraints.map((c) => `- ${c}`).join("\n")}`
      : ""
  return `${header}\n${schema}${constraints}`
}

const formatBlockSchemas = (schemas: BlockSchemaDefinition[]): InputItem => ({
  type: "message",
  role: "system",
  content: `Document block schemas:\n\n${schemas.map(formatBlockSchema).join("\n\n")}`,
})

const buildRequestBody = (options: CallLlmOptions): string => {
  const messages = options.blockSchemas?.length
    ? [...options.messages, formatBlockSchemas(options.blockSchemas)]
    : options.messages
  const body: Record<string, unknown> = { messages }
  if (options.tools) body.tools = options.tools
  if (options.responseFormat) body.response_format = options.responseFormat
  return JSON.stringify(body)
}

export const callLlm = async (options: CallLlmOptions): Promise<Block[]> => {
  const response = await fetchWithRetry({
    url: `${getLlmHost()}${options.endpoint}`,
    body: buildRequestBody(options),
    signal: options.signal,
  })
  return streamToBlocks(response, options.callbacks ?? {})
}
