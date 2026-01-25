import type { Block, ToolCall, ToolResultBlock } from "./types"
import type { InputItem, ParseCallbacks } from "./parser"
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
    const block = { type: "tool_result" as const, callId: call.id, toolName: call.name, result: sanitizeForJson(result) }
    console.log(`[Tool] result: ${call.name}`, block.result)
    return block
  } catch (e) {
    const block = { type: "tool_result" as const, callId: call.id, toolName: call.name, result: formatError(e) }
    console.log(`[Tool] error: ${call.name}`, block.result)
    return block
  }
}

const countHunks = (diff: string): number => (diff.match(/@@/g) ?? []).length

const logPatchSummary = (calls: ToolCall[]): void => {
  const patches = calls.filter((c) => c.name === "apply_local_patch")
  if (patches.length === 0) return

  const byFile = patches.reduce<Record<string, { patches: number; hunks: number }>>((acc, call) => {
    const op = call.args.operation as { path?: string; diff?: string } | undefined
    const path = op?.path ?? "unknown"
    const hunks = countHunks(op?.diff ?? "")
    if (!acc[path]) acc[path] = { patches: 0, hunks: 0 }
    acc[path].patches += 1
    acc[path].hunks += hunks
    return acc
  }, {})

  const summary = Object.entries(byFile)
    .map(([file, { patches, hunks }]) => `${file}: ${patches} patch(es), ${hunks} hunk(s)`)
    .join(", ")
  console.log(`[Patches] ${patches.length} total — ${summary}`)
}

export const executeTools = (calls: ToolCall[], execute: ToolExecutor): Promise<ToolResultBlock[]> => {
  logPatchSummary(calls)
  return Promise.all(calls.map((call) => executeTool(call, execute)))
}

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
    console.log(`[Tool] executing immediately: ${call.name}`)
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
