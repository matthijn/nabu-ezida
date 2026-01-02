import type { State, Block, Action, ToolCall, ToolResultBlock } from "./types"
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
}

const findAskUser = (calls: ToolCall[]): ToolCall | undefined =>
  calls.find((c) => c.name === "ask_user")

const executeTool = async (
  call: ToolCall,
  execute: ToolExecutor
): Promise<ToolResultBlock> => {
  try {
    const result = await execute(call)
    return { type: "tool_result", callId: call.id, result }
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e)
    return { type: "tool_result", callId: call.id, result: { error } }
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
      const askUser = findAskUser(block.calls)
      if (askUser) {
        const question = (askUser.args.question as string) ?? ""
        const textBlock = { type: "text" as const, content: question }
        allBlocks.push(textBlock)
        currentState = reducer(currentState, textBlock)
        return { state: currentState, action: { type: "wait_user" }, blocks: allBlocks }
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
