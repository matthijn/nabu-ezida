import type { State, Block, Action, ToolCall, ToolResultBlock, Plan } from "./types"
import type { Message, ParseCallbacks } from "./parser"
import { parse } from "./parser"
import { reducer } from "./reducer"
import { orchestrator } from "./orchestrator"

type ToolExecutor = (call: ToolCall) => Promise<unknown>

export type TurnDeps = {
  endpoint: string
  execute: ToolExecutor
  callbacks?: ParseCallbacks
  signal?: AbortSignal
}

export type TurnResult = {
  state: State
  action: Action
  blocks: Block[]
  abortedPlan?: Plan
}

const findAbort = (calls: ToolCall[]): ToolCall | undefined =>
  calls.find((c) => c.name === "abort")

const formatError = (e: unknown): unknown => {
  if (e instanceof Error) return { error: e.message }
  if (typeof e === "object" && e !== null) return e
  return { error: String(e) }
}

const executeTool = async (
  call: ToolCall,
  execute: ToolExecutor
): Promise<ToolResultBlock> => {
  try {
    const result = await execute(call)
    return { type: "tool_result", callId: call.id, result }
  } catch (e) {
    return { type: "tool_result", callId: call.id, result: formatError(e) }
  }
}

const executeTools = (calls: ToolCall[], execute: ToolExecutor): Promise<ToolResultBlock[]> =>
  Promise.all(calls.map((call) => executeTool(call, execute)))

export const turn = async (
  state: State,
  messages: Message[],
  deps: TurnDeps
): Promise<TurnResult> => {
  const { endpoint, execute, callbacks, signal } = deps
  const allBlocks: Block[] = []

  console.log("[Turn] Messages:", JSON.stringify(messages, null, 2))
  const parsedBlocks = await parse({ endpoint, messages, callbacks, signal })
  console.log("[Turn] Parsed blocks:", JSON.stringify(parsedBlocks, null, 2))

  if (parsedBlocks.length === 0) {
    return { state, action: { type: "done" }, blocks: allBlocks }
  }

  let currentState = state

  for (const block of parsedBlocks) {
    if (block.type === "tool_call") {
      const abort = findAbort(block.calls)
      if (abort) {
        const abortedPlan = currentState.plan ?? undefined
        const message = (abort.args.message as string) ?? ""
        const textBlock = { type: "text" as const, content: message }
        allBlocks.push(textBlock)
        currentState = { ...reducer(currentState, textBlock), plan: null }
        return { state: currentState, action: { type: "done" }, blocks: allBlocks, abortedPlan }
      }

      allBlocks.push(block)
      currentState = reducer(currentState, block)

      const resultBlocks = await executeTools(block.calls, execute)
      console.log("[Turn] Tool results:", JSON.stringify(resultBlocks, null, 2))
      for (const resultBlock of resultBlocks) {
        allBlocks.push(resultBlock)
        currentState = reducer(currentState, resultBlock)
      }
    } else {
      allBlocks.push(block)
      currentState = reducer(currentState, block)
    }
  }

  const lastBlock = allBlocks[allBlocks.length - 1]
  const action = orchestrator(currentState, lastBlock)
  console.log("[Turn] Action:", action)

  return { state: currentState, action, blocks: allBlocks }
}
