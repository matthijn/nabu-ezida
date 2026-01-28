import type { Block, ToolCall, ToolResultBlock, ToolResult } from "./types"
import type { InputItem, ParseCallbacks } from "./stream"
import { parse } from "./stream"
import { isToolCallBlock } from "./derived"

export type ToolExecutor = (call: ToolCall) => Promise<ToolResult<unknown>>

export const appendBlock = (history: Block[], block: Block): Block[] => [...history, block]

export const appendBlocks = (history: Block[], blocks: Block[]): Block[] => [...history, ...blocks]

export type TurnDeps = {
  endpoint: string
  execute: ToolExecutor
  callbacks?: ParseCallbacks
  signal?: AbortSignal
}

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

export const runPrompt = async (
  endpoint: string,
  context: string,
  execute: ToolExecutor,
  signal?: AbortSignal
): Promise<void> => {
  const messages: InputItem[] = [{ type: "message", role: "system", content: context }]
  const blocks = await parse({ endpoint, messages, signal })
  const calls = blocks.filter(isToolCallBlock).flatMap(b => b.calls)
  if (calls.length > 0) {
    await executeTools(calls, execute)
  }
}

export const turn = async (history: Block[], messages: InputItem[], deps: TurnDeps): Promise<Block[]> => {
  const { endpoint, execute, callbacks, signal } = deps

  const pendingResults = new Map<string, Promise<ToolResultBlock>>()

  const onToolCall = (call: ToolCall): void => {
    pendingResults.set(call.id, executeTool(call, execute))
  }

  const mergedCallbacks = { ...callbacks, onToolCall }

  const parsedBlocks = await parse({ endpoint, messages, callbacks: mergedCallbacks, signal })

  let h = history
  for (const block of parsedBlocks) {
    h = appendBlock(h, block)
    if (block.type === "tool_call") {
      const results = await Promise.all(
        block.calls.map((call) => pendingResults.get(call.id) ?? executeTool(call, execute))
      )
      for (const result of results) {
        h = appendBlock(h, result)
      }
    }
  }

  return h
}
