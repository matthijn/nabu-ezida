import type { Block, BlockOrigin, ToolResult } from "./types"
import type { ParseCallbacks } from "./stream"
import type { ToolExecutor } from "./turn"
import type { AgentDef } from "./executors/agents"
import { buildEndpoint } from "./executors/agents"
import { toToolDefinition } from "./executors/tool"
import { buildCaller } from "./caller"
import { pushBlocks, tagBlocks, getAllBlocks } from "./block-store"
import { collect, isEmptyNudgeBlock } from "./steering/nudge-tools"
import { getBlockSchemaDefinitions } from "~/domain/blocks/registry"
import { TERMINAL_TOOLS } from "./executors/reporting"

export type AgentLoopConfig = {
  origin: BlockOrigin
  agent: AgentDef
  executor: ToolExecutor
  callbacks?: ParseCallbacks
  signal?: AbortSignal
}

const excludeReasoning = (blocks: Block[]): Block[] =>
  blocks.filter((b) => b.type !== "reasoning")

const hasToolCalls = (blocks: Block[]): boolean =>
  blocks.some((b) => b.type === "tool_call")

const findTerminalResult = (blocks: Block[]): ToolResult<unknown> | null => {
  for (const block of blocks) {
    if (block.type !== "tool_result") continue
    if (!block.toolName || !TERMINAL_TOOLS.has(block.toolName)) continue
    const result = block.result as ToolResult<unknown>
    if (block.toolName === "reject") {
      const args = result.output as { reason: string; need: string }
      return { status: "error", output: `Rejected: ${args.reason}. Need: ${args.need}` }
    }
    return { status: "ok", output: result.output }
  }
  return null
}

export const agentLoop = async (config: AgentLoopConfig): Promise<ToolResult<unknown> | null> => {
  const { origin, agent, executor, callbacks, signal } = config

  const readBlocks = (): Block[] =>
    getAllBlocks().filter((b) => b.origin.instance === origin.instance)
  const nudge = collect(...agent.nudges)
  const tools = agent.tools.map(toToolDefinition)

  const caller = buildCaller(origin, {
    endpoint: buildEndpoint(agent),
    tools,
    blockSchemas: getBlockSchemaDefinitions(),
    execute: executor,
    callbacks,
    readBlocks,
  })

  while (true) {
    const nudges = await nudge(excludeReasoning(readBlocks()))
    if (nudges.length === 0) return null

    const nonEmpty = nudges.filter((b) => !isEmptyNudgeBlock(b))
    if (nonEmpty.length > 0) {
      pushBlocks(tagBlocks(origin, nonEmpty))
    }

    const newBlocks = await caller(signal)

    const terminal = findTerminalResult(newBlocks)
    if (terminal) return terminal

    if (agent.chat && !hasToolCalls(newBlocks)) return null
  }
}
