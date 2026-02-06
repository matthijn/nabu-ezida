import type { Block, ToolCall, ToolResultBlock, ToolResult } from "./types"

export type ToolExecutor = (call: ToolCall) => Promise<ToolResult<unknown>>

export const appendBlock = (history: Block[], block: Block): Block[] => [...history, block]

export const appendBlocks = (history: Block[], blocks: Block[]): Block[] => [...history, ...blocks]

const logToolResult = (call: ToolCall, res: ToolResult<unknown>): void => {
  const log = res.status === "ok" ? console.debug : console.warn
  log(`[TOOL ${call.name}]`, { call, ...res })
}

const toErrorResult = (e: unknown): ToolResult<unknown> => ({
  status: "error",
  output: e instanceof Error ? e.message : String(e),
})

export const executeTool = async (call: ToolCall, execute: ToolExecutor): Promise<ToolResultBlock> => {
  const res = await execute(call).catch(toErrorResult)
  logToolResult(call, res)
  return { type: "tool_result", callId: call.id, toolName: call.name, result: res }
}

export const executeTools = (calls: ToolCall[], execute: ToolExecutor): Promise<ToolResultBlock[]> =>
  Promise.all(calls.map((call) => executeTool(call, execute)))
