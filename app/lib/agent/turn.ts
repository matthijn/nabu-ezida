import type { Block, ToolCall, ToolResultBlock, ToolResult } from "./types"
import { isAbortError } from "~/lib/utils"

export type ToolExecutor = (call: ToolCall) => Promise<ToolResult<unknown>>

const logToolResult = (call: ToolCall, res: ToolResult<unknown>): void => {
  const log = res.status === "ok" ? console.debug : console.warn
  log(`[TOOL ${call.name}]`, { call, ...res })
}

const toErrorResult = (e: unknown): ToolResult<unknown> => {
  if (isAbortError(e)) throw e
  return { status: "error", output: e instanceof Error ? e.message : String(e) }
}

export const executeTool = async (call: ToolCall, execute: ToolExecutor): Promise<ToolResultBlock> => {
  const res = await execute(call).catch(toErrorResult)
  logToolResult(call, res)
  return { type: "tool_result", callId: call.id, toolName: call.name, result: res }
}

export const executeTools = (calls: ToolCall[], execute: ToolExecutor): Promise<ToolResultBlock[]> =>
  Promise.all(calls.map((call) => executeTool(call, execute)))
