import type { Block, ToolCall, ToolResultBlock } from "./types"
import type { Message, ParseCallbacks } from "./parser"
import { parse } from "./parser"
import { appendBlock } from "./reducer"
import { isToolCallBlock } from "./selectors"

export type ToolExecutor = (call: ToolCall) => Promise<unknown>

export type TurnDeps = {
  endpoint: string
  execute: ToolExecutor
  callbacks?: ParseCallbacks
  signal?: AbortSignal
}

const sanitizeForJson = (value: unknown): unknown => {
  if (typeof value === "bigint") return Number(value)
  if (Array.isArray(value)) return value.map(sanitizeForJson)
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, sanitizeForJson(v)])
    )
  }
  return value
}

const formatError = (e: unknown): unknown => {
  if (e instanceof Error) return { error: e.message }
  if (typeof e === "object" && e !== null) return e
  return { error: String(e) }
}

export const executeTool = async (call: ToolCall, execute: ToolExecutor): Promise<ToolResultBlock> => {
  try {
    const result = await execute(call)
    return { type: "tool_result", callId: call.id, result: sanitizeForJson(result) }
  } catch (e) {
    return { type: "tool_result", callId: call.id, result: formatError(e) }
  }
}

export const executeTools = (calls: ToolCall[], execute: ToolExecutor): Promise<ToolResultBlock[]> =>
  Promise.all(calls.map((call) => executeTool(call, execute)))

export const runPrompt = async (
  endpoint: string,
  context: string,
  execute: ToolExecutor,
  signal?: AbortSignal
): Promise<void> => {
  const messages: Message[] = [{ role: "system", content: context }]
  const blocks = await parse({ endpoint, messages, signal })
  const calls = blocks.filter(isToolCallBlock).flatMap(b => b.calls)
  if (calls.length > 0) {
    await executeTools(calls, execute)
  }
}

export const turn = async (history: Block[], messages: Message[], deps: TurnDeps): Promise<Block[]> => {
  const { endpoint, execute, callbacks, signal } = deps

  const parsedBlocks = await parse({ endpoint, messages, callbacks, signal })

  let h = history
  for (const block of parsedBlocks) {
    h = appendBlock(h, block)
    if (block.type === "tool_call") {
      const results = await executeTools(block.calls, execute)
      for (const result of results) {
        h = appendBlock(h, result)
      }
    }
  }

  return h
}
