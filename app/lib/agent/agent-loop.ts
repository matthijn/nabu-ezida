import type { Block, BlockOrigin } from "./types"
import type { ParseCallbacks } from "./stream"
import type { ToolExecutor } from "./turn"
import { toToolDefinition, type ToolDefinitionOptions } from "./executors/tool"
import { buildCaller } from "./caller"
import { pushBlocks, tagBlocks, getAllBlocks } from "./block-store"
import { collect, isEmptyNudgeBlock } from "./steering/nudge-tools"
import { getBlockSchemaDefinitions } from "~/domain/blocks/registry"
import { modes, deriveMode, ENDPOINT } from "./executors/modes"

export type AgentLoopConfig = {
  origin: BlockOrigin
  executor: ToolExecutor
  callbacks?: ParseCallbacks
  signal?: AbortSignal
}

export const excludeReasoning = (blocks: Block[]): Block[] =>
  blocks.filter((b) => b.type !== "reasoning")

export const hasToolCalls = (blocks: Block[]): boolean =>
  blocks.some((b) => b.type === "tool_call")

export const extractLastText = (blocks: Block[]): string =>
  blocks.filter((b) => b.type === "text").map((b) => b.content).join("\n") || ""

export const shouldContinue = (newBlocks: Block[]): boolean =>
  hasToolCalls(newBlocks) || !extractLastText(newBlocks)

const readDebugOption = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback
  try {
    const stored = localStorage.getItem("nabu-debug-options")
    return stored ? (JSON.parse(stored)[key] ?? fallback) : fallback
  } catch {
    return fallback
  }
}

const readThenEnabled = (): boolean => readDebugOption("thenEnabled", false)

const readReasoningSummary = (): string =>
  readDebugOption("reasoningSummaryAuto", false) ? "auto" : "concise"

export const agentLoop = async (config: AgentLoopConfig): Promise<void> => {
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
    if (nudges.length === 0) return

    const nonEmpty = nudges.filter((b) => !isEmptyNudgeBlock(b))
    if (nonEmpty.length > 0) {
      pushBlocks(tagBlocks(origin, nonEmpty))
    }

    const caller = buildCaller(origin, {
      endpoint: `${ENDPOINT}&reasoning_summary=${readReasoningSummary()}`,
      tools,
      blockSchemas: getBlockSchemaDefinitions(),
      execute: executor,
      callbacks,
      readBlocks,
    })

    const newBlocks = await caller(signal)
    if (!shouldContinue(newBlocks)) return
  }
}
