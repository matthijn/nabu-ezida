import type { Block, ToolCall, ToolResultBlock } from "./types"
import type { Message, ParseCallbacks } from "./parser"
import type { DerivedPlan } from "./selectors"
import { parse } from "./parser"
import { appendBlock } from "./reducer"
import { toNudge } from "./orchestrator"
import { derive, lastPlan, getMode } from "./selectors"
import { buildModeRequiredNudge } from "./prompts"

const MODE_EXEMPT = new Set([
  "create_plan",
  "start_exploration",
  "complete_step",
  "exploration_step",
  "abort",
])

type ToolExecutor = (call: ToolCall) => Promise<unknown>

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

const executeTool = async (call: ToolCall, execute: ToolExecutor): Promise<ToolResultBlock> => {
  try {
    const result = await execute(call)
    return { type: "tool_result", callId: call.id, result: sanitizeForJson(result) }
  } catch (e) {
    return { type: "tool_result", callId: call.id, result: formatError(e) }
  }
}

const executeTools = (calls: ToolCall[], execute: ToolExecutor): Promise<ToolResultBlock[]> =>
  Promise.all(calls.map((call) => executeTool(call, execute)))

export const turn = async (history: Block[], messages: Message[], deps: TurnDeps): Promise<TurnResult> => {
  const { endpoint, execute, callbacks, signal } = deps
  const allBlocks: Block[] = []

  console.log("[Turn] Messages:", JSON.stringify(messages, null, 2))
  const parsedBlocks = await parse({ endpoint, messages, callbacks, signal })
  console.log("[Turn] Parsed blocks:", JSON.stringify(parsedBlocks, null, 2))

  if (parsedBlocks.length === 0) {
    return { history, nudge: null, blocks: allBlocks }
  }

  let currentHistory = history

  for (const block of parsedBlocks) {
    if (block.type === "tool_call") {
      const mode = getMode(derive(currentHistory))
      if (mode === "chat") {
        const blocked = block.calls.filter((c) => !MODE_EXEMPT.has(c.name))
        if (blocked.length > 0) {
          const nudge = buildModeRequiredNudge(blocked.map((c) => c.name))
          return { history: currentHistory, nudge, blocks: allBlocks }
        }
      }

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
      console.log("[Turn] Tool results:", JSON.stringify(resultBlocks, null, 2))
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
  console.log("[Turn] Nudge:", nudge)

  return { history: currentHistory, nudge, blocks: allBlocks }
}
