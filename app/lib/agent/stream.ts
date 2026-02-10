import { z } from "zod"
import type { Block, ToolCall } from "./types"
import { getLlmHost } from "~/lib/env"
import { calculateBackoff } from "~/lib/backoff"
import type { ToolDefinition } from "./executors/tool"
import type { BlockSchemaDefinition } from "~/domain/blocks/registry"

type InputItem =
  | { type: "message"; role: "system" | "user" | "assistant"; content: string }
  | { type: "function_call"; call_id: string; status: string; name: string; arguments: string }
  | { type: "function_call_output"; call_id: string; status: string; output: string }

type ParseCallbacks = {
  onChunk?: (text: string) => void
  onToolArgsChunk?: (text: string) => void
  onReasoningChunk?: (text: string) => void
  onBlock?: (block: Block) => void
  onToolName?: (name: string) => void
  onToolCall?: (call: ToolCall) => void
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
  reasoningContent: string
  toolCalls: ToolCall[]
  streamingToolName: string | null
}

export const initialParseState = (): ParseState => ({
  currentEvent: "",
  textContent: "",
  reasoningContent: "",
  toolCalls: [],
  streamingToolName: null,
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

    if (state.currentEvent === "response.output_item.added") {
      if (parsed.item?.type === "function_call") {
        const name = parsed.item.name
        if (name && name !== state.streamingToolName) {
          callbacks.onToolName?.(name)
          return { ...state, streamingToolName: name }
        }
      }
    }

    if (state.currentEvent === "response.function_call_arguments.delta") {
      if (parsed.delta) {
        callbacks.onToolArgsChunk?.(parsed.delta)
      }
      return state
    }

    if (state.currentEvent === "response.reasoning_summary_text.delta") {
      if (parsed.delta) {
        callbacks.onReasoningChunk?.(parsed.delta)
        return { ...state, reasoningContent: state.reasoningContent + parsed.delta }
      }
      return state
    }

    if (state.currentEvent === "response.output_item.done" && parsed.item) {
      const item = parsed.item
      if (item.type === "function_call") {
        const toolCall: ToolCall = {
          id: item.call_id,
          name: item.name,
          args: parseToolArgs(item.arguments),
        }
        callbacks.onToolCall?.(toolCall)
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
  if (state.reasoningContent) {
    blocks.push({ type: "reasoning", content: state.reasoningContent })
  }
  if (state.textContent) {
    blocks.push({ type: "text", content: state.textContent })
  }
  if (state.toolCalls.length > 0) {
    blocks.push({ type: "tool_call", calls: state.toolCalls })
  }
  return blocks
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

  console.debug("[STREAM END]", { toolCalls: state.toolCalls.length })

  return blocks
}

type ResponseFormat = {
  type: "json_schema"
  json_schema: {
    name: string
    schema: unknown
    strict: boolean
  }
}

const isObjectWithProperties = (s: Record<string, unknown>): boolean =>
  s.type === "object" && typeof s.properties === "object" && s.properties !== null

export const toStrictSchema = (schema: unknown): unknown => {
  if (typeof schema !== "object" || schema === null) return schema
  const { $schema: _, ...s } = schema as Record<string, unknown>

  if (s.type === "array" && s.items) {
    return { ...s, items: toStrictSchema(s.items) }
  }

  if (isObjectWithProperties(s)) {
    const properties = s.properties as Record<string, unknown>
    const originalRequired = new Set(Array.isArray(s.required) ? (s.required as string[]) : [])
    const allKeys = Object.keys(properties)

    const wrapOptional = (key: string, prop: unknown): unknown =>
      originalRequired.has(key) ? prop : { anyOf: [prop, { type: "null" }] }

    const strictProperties = Object.fromEntries(
      allKeys.map((key) => [key, wrapOptional(key, toStrictSchema(properties[key]))])
    )

    return { ...s, properties: strictProperties, required: allKeys, additionalProperties: false }
  }

  for (const key of ["anyOf", "oneOf", "allOf"]) {
    if (Array.isArray(s[key])) {
      return { ...s, [key]: (s[key] as unknown[]).map(toStrictSchema) }
    }
  }

  return s
}

export const toResponseFormat = <T extends z.ZodType>(schema: T): ResponseFormat => ({
  type: "json_schema",
  json_schema: {
    name: "response",
    schema: toStrictSchema(schema.toJSONSchema()),
    strict: true,
  },
})

export type CallLlmOptions = {
  endpoint: string
  messages: InputItem[]
  tools?: ToolDefinition[]
  blockSchemas?: BlockSchemaDefinition[]
  responseFormat?: ResponseFormat
  chat?: boolean
  callbacks?: ParseCallbacks
  signal?: AbortSignal
}

const formatBlockSchema = (s: BlockSchemaDefinition): string => {
  const traits = [s.singleton ? "singleton" : "multiple"]
  if (s.immutable.length > 0) traits.push(`immutable: ${s.immutable.join(", ")}`)
  const header = `### ${s.language} (${traits.join("; ")})`
  const schema = JSON.stringify(s.jsonSchema, null, 2)
  const constraints = s.constraints.length > 0
    ? `\nConstraints:\n${s.constraints.map((c) => `- ${c}`).join("\n")}`
    : ""
  return `${header}\n${schema}${constraints}`
}

const formatBlockSchemas = (schemas: BlockSchemaDefinition[]): InputItem => ({
  type: "message",
  role: "system",
  content: `Document block schemas for patch_json_block and remove_block:\n\n${schemas.map(formatBlockSchema).join("\n\n")}`,
})

const buildRequestBody = (options: CallLlmOptions): string => {
  const messages = options.blockSchemas?.length
    ? [...options.messages, formatBlockSchemas(options.blockSchemas)]
    : options.messages
  const body: Record<string, unknown> = { messages }
  if (options.tools) body.tools = options.tools
  if (options.responseFormat) body.response_format = options.responseFormat
  if (options.chat) body.chat = true
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

export const extractText = (blocks: Block[]): string => {
  const textBlock = blocks.find((b) => b.type === "text")
  return textBlock?.type === "text" ? textBlock.content : ""
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
    return block.calls.map((c) => ({
      type: "function_call" as const,
      call_id: c.id,
      status: "completed",
      name: c.name,
      arguments: JSON.stringify(c.args),
    }))
  }
  if (block.type === "tool_result") {
    return {
      type: "function_call_output" as const,
      call_id: block.callId,
      status: "completed",
      output: JSON.stringify(block.result),
    }
  }
  if (block.type === "reasoning" || block.type === "empty_nudge") {
    return []
  }
  return []
}

export const blocksToMessages = (blocks: Block[]): InputItem[] =>
  blocks.flatMap(blockToInputItem)

export type { InputItem, ParseCallbacks, ResponseFormat }
