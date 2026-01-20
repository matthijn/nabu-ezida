import type { Block, ToolCall, ToolResultBlock } from "./types"
import type { Message, ParseCallbacks } from "./parser"
import type { DerivedPlan } from "./selectors"
import { parse } from "./parser"
import { appendBlock } from "./reducer"
import { toNudge } from "./orchestrator"
import { derive, lastPlan, isToolCallBlock } from "./selectors"

export type ToolExecutor = (call: ToolCall) => Promise<unknown>

export type TurnDeps = {
  endpoint: string
  execute: ToolExecutor
  callbacks?: ParseCallbacks
  signal?: AbortSignal
}

export type TurnResult = {
  history: Block[]
  nudge: string | null
  blocks: Block[]
  abortedPlan?: DerivedPlan
}

const findAbort = (calls: ToolCall[]): ToolCall | undefined =>
  calls.find((c) => c.name === "abort")

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

export const turn = async (history: Block[], messages: Message[], deps: TurnDeps): Promise<TurnResult> => {
  const { endpoint, execute, callbacks, signal } = deps
  const allBlocks: Block[] = []

  const parsedBlocks = await parse({ endpoint, messages, callbacks, signal })

  if (parsedBlocks.length === 0) {
    return { history, nudge: null, blocks: allBlocks }
  }

  let currentHistory = history

  for (const block of parsedBlocks) {
    if (block.type === "tool_call") {
      const abort = findAbort(block.calls)
      if (abort) {
        const abortedPlan = lastPlan(derive(currentHistory)) ?? undefined
        const message = (abort.args.message as string) ?? ""
        const abortBlock = { type: "abort" as const, content: message }
        const abortResult: ToolResultBlock = { type: "tool_result", callId: abort.id, result: { aborted: true } }
        allBlocks.push(abortBlock)
        currentHistory = appendBlock(currentHistory, block)
        currentHistory = appendBlock(currentHistory, abortResult)
        currentHistory = appendBlock(currentHistory, abortBlock)
        return { history: currentHistory, nudge: null, blocks: allBlocks, abortedPlan }
      }

      allBlocks.push(block)
      currentHistory = appendBlock(currentHistory, block)

      const resultBlocks = await executeTools(block.calls, execute)
      for (const resultBlock of resultBlocks) {
        allBlocks.push(resultBlock)
        currentHistory = appendBlock(currentHistory, resultBlock)
      }
    } else {
      allBlocks.push(block)
      currentHistory = appendBlock(currentHistory, block)
    }
  }

  const nudge = toNudge(currentHistory)

  return { history: currentHistory, nudge, blocks: allBlocks }
}
