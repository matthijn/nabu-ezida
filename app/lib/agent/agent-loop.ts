import type { Block, BlockOrigin, ToolResult } from "./types"
import type { ParseCallbacks } from "./stream"
import type { ToolExecutor } from "./turn"
import { toToolDefinition, type ToolDefinitionOptions } from "./executors/tool"
import { buildCaller } from "./caller"
import { pushBlocks, tagBlocks, getAllBlocks } from "./block-store"
import { collect, isEmptyNudgeBlock } from "./steering/nudge-tools"
import { getBlockSchemaDefinitions } from "~/domain/blocks/registry"
import { TERMINAL_TOOLS } from "./executors/tools"
import { modes, deriveMode, ENDPOINT } from "./executors/modes"

export type AgentLoopConfig = {
  origin: BlockOrigin
  executor: ToolExecutor
  callbacks?: ParseCallbacks
  signal?: AbortSignal
}

export type LoopAction =
  | { type: "terminal"; result: ToolResult<unknown> }
  | { type: "continue" }
  | { type: "stop" }

export const excludeReasoning = (blocks: Block[]): Block[] =>
  blocks.filter((b) => b.type !== "reasoning")

export const hasToolCalls = (blocks: Block[]): boolean =>
  blocks.some((b) => b.type === "tool_call")

export const findTerminalResult = (blocks: Block[]): ToolResult<unknown> | null => {
  for (const block of blocks) {
    if (block.type !== "tool_result") continue
    if (!block.toolName || !TERMINAL_TOOLS.has(block.toolName)) continue
    return { status: "ok", output: (block.result as ToolResult<unknown>).output }
  }
  return null
}

export const extractLastText = (blocks: Block[]): string =>
  blocks.filter((b) => b.type === "text").map((b) => b.content).join("\n") || ""

export const processResponse = (newBlocks: Block[]): LoopAction => {
  const terminal = findTerminalResult(newBlocks)
  if (terminal) return { type: "terminal", result: terminal }
  if (hasToolCalls(newBlocks)) return { type: "continue" }
  const text = extractLastText(newBlocks)
  if (text) return { type: "stop" }
  return { type: "continue" }
}

const readThenEnabled = (): boolean => {
  if (typeof window === "undefined") return true
  try {
    const stored = localStorage.getItem("nabu-debug-options")
    return stored ? (JSON.parse(stored).thenEnabled ?? false) : false
  } catch {
    return false
  }
}

export const agentLoop = async (config: AgentLoopConfig): Promise<ToolResult<unknown> | null> => {
  const { origin, executor, callbacks, signal } = config

  const readBlocks = (): Block[] =>
    getAllBlocks().filter((b) => b.origin.instance === origin.instance)
  const toolOptions: ToolDefinitionOptions = { includeThen: readThenEnabled() }

  while (true) {
    const blocks = readBlocks()
    const mode = deriveMode(blocks)
    const modeConfig = modes[mode]
    const tools = modeConfig.tools.map((t) => toToolDefinition(t, toolOptions))
    const nudge = collect(...modeConfig.nudges)

    const nudges = await nudge(excludeReasoning(blocks))
    if (nudges.length === 0) return null

    const nonEmpty = nudges.filter((b) => !isEmptyNudgeBlock(b))
    if (nonEmpty.length > 0) {
      pushBlocks(tagBlocks(origin, nonEmpty))
    }

    const caller = buildCaller(origin, {
      endpoint: ENDPOINT,
      tools,
      blockSchemas: getBlockSchemaDefinitions(),
      execute: executor,
      callbacks,
      readBlocks,
    })

    const newBlocks = await caller(signal)

    const action = processResponse(newBlocks)
    if (action.type === "terminal") return action.result
    if (action.type === "stop") return null
  }
}
