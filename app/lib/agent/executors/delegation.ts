import { getToolHandlers, toToolDefinition } from "./tool"
import { createExecutor } from "./execute"
import { TERMINAL_TOOLS } from "./reporting"
import { TaskArgs, OrchestrateArgs, ForEachArgs } from "./delegation-tools"
import type { ToolCall, ToolResult, Block, BlockOrigin } from "../types"
import type { ToolExecutor } from "../turn"
import { createInstance } from "../types"
import { agents, buildEndpoint } from "./agents"
import type { AgentDef } from "./agents"
import { buildCaller } from "../caller"
import { pushBlocks, tagBlocks, getBlocksForInstances } from "../block-store"
import { getStreamingCallbacks, getStreamingSignal } from "../streaming-context"
import { collect, isEmptyNudgeBlock } from "../steering/nudge-tools"
import { getBlockSchemaDefinitions } from "~/domain/blocks/registry"
import { getFileRaw, getStoredAnnotations } from "~/lib/files"
import { filterMatchingAnnotations } from "~/domain/attributes/annotations"
import { stripAttributesBlock } from "~/lib/text/markdown"

type TaskContext = {
  intent: string
  outcome?: string
  context?: string
  involvement?: string
  constraints?: string
}

const formatTaskContext = (args: TaskContext): string =>
  [
    "# Delegated Task",
    `**Intent:** ${args.intent}`,
    args.outcome && `**Expected Outcome:** ${args.outcome}`,
    args.context && `**Context:** ${args.context}`,
    args.involvement && `**Involvement:** ${args.involvement}`,
    args.constraints && `**Constraints:** ${args.constraints}`,
  ].filter(Boolean).join("\n")

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

const excludeReasoning = (blocks: Block[]): Block[] =>
  blocks.filter((b) => b.type !== "reasoning")

const runPhase = async (origin: BlockOrigin, agent: AgentDef, signal?: AbortSignal): Promise<ToolResult<unknown> | null> => {
  const tools = agent.tools.map(toToolDefinition)
  const base = createExecutor(getToolHandlers())
  const executor = withDelegation(base, origin)
  const readBlocks = (): Block[] => getBlocksForInstances([origin.instance])
  const nudge = collect(...agent.nudges)

  const caller = buildCaller(origin, {
    endpoint: buildEndpoint(agent),
    tools,
    blockSchemas: getBlockSchemaDefinitions(),
    execute: executor,
    callbacks: getStreamingCallbacks(),
    readBlocks,
  })

  while (true) {
    const newBlocks = await caller(signal)
    const terminal = findTerminalResult(newBlocks)
    if (terminal) return terminal

    const nudges = await nudge(excludeReasoning(readBlocks()))
    const nonEmpty = nudges.filter((b) => !isEmptyNudgeBlock(b))
    if (nonEmpty.length > 0) {
      pushBlocks(tagBlocks(origin, nonEmpty))
    }
  }
}

const startPhase = async (agentKey: string, context: string): Promise<ToolResult<unknown>> => {
  const agent = agents[agentKey]
  if (!agent) return { status: "error", output: `Unknown agent: ${agentKey}` }

  const origin: BlockOrigin = { agent: agentKey, instance: createInstance(agentKey) }
  pushBlocks(tagBlocks(origin, [{ type: "system", content: context }]))
  const result = await runPhase(origin, agent, getStreamingSignal())
  return result ?? { status: "error", output: "Agent ended without resolve/reject" }
}

const startBranch = async (agentKey: string, frozenBlocks: Block[], context: string): Promise<ToolResult<unknown>> => {
  const agent = agents[agentKey]
  if (!agent) return { status: "error", output: `Unknown agent: ${agentKey}` }

  const origin: BlockOrigin = { agent: agentKey, instance: createInstance(agentKey) }
  const history = tagBlocks(origin, frozenBlocks)
  pushBlocks([...history, ...tagBlocks(origin, [{ type: "system", content: context }])])
  const result = await runPhase(origin, agent, getStreamingSignal())
  return result ?? { status: "error", output: "Agent ended without resolve/reject" }
}

const executeDelegation = async (call: ToolCall): Promise<ToolResult<unknown>> => {
  const parsed = TaskArgs.safeParse(call.args)
  if (!parsed.success) return { status: "error", output: `Invalid args: ${parsed.error.message}` }

  const { who, ...fields } = parsed.data
  return startPhase(who, formatTaskContext(fields))
}

const executeOrchestrate = async (call: ToolCall, origin: BlockOrigin): Promise<ToolResult<unknown>> => {
  const parsed = OrchestrateArgs.safeParse(call.args)
  if (!parsed.success) return { status: "error", output: `Invalid args: ${parsed.error.message}` }

  const agentKey = origin.agent
  const planKey = `${agentKey}/plan`
  const execKey = `${agentKey}/exec`

  if (!agents[planKey] || !agents[execKey]) {
    return { status: "error", output: `Missing plan/exec agents for: ${agentKey}` }
  }

  const taskContext = formatTaskContext(parsed.data)

  const planResult = await startPhase(planKey, taskContext)
  if (planResult.status === "error") return planResult

  const execContext = [taskContext, "\n## Plan Result", JSON.stringify(planResult.output)].join("\n")
  return startPhase(execKey, execContext)
}

type BranchResult = { file: string; result: ToolResult<unknown> }

const readFileChunk = (file: string): string => {
  const raw = getFileRaw(file)
  return raw ? stripAttributesBlock(raw) : ""
}

const readFileAnnotations = (file: string): string => {
  const raw = getFileRaw(file)
  if (!raw) return ""
  const prose = stripAttributesBlock(raw)
  const annotations = filterMatchingAnnotations(getStoredAnnotations(raw), prose)
  if (annotations.length === 0) return ""
  return JSON.stringify(annotations)
}

const formatBranchContext = (task: string, file: string, content: string, annotations: string, priorResults: BranchResult[]): string =>
  [
    `# Task\n${task}`,
    `## File: ${file}\n${content}`,
    annotations && `## Annotations\n${annotations}`,
    priorResults.length > 0 && formatPriorResults(priorResults),
  ].filter(Boolean).join("\n\n")

const formatPriorResults = (results: BranchResult[]): string =>
  ["## Prior Results", ...results.map(formatBranchResult)].join("\n\n")

const formatBranchResult = (r: BranchResult): string =>
  `### ${r.file}\n${JSON.stringify(r.result.output)}`

const formatMergeContext = (task: string, results: BranchResult[]): string =>
  [
    "# Merge Results",
    `**Original task:** ${task}`,
    `**Files processed:** ${results.length}`,
    formatPriorResults(results),
    "Summarize the results into a single resolve or reject.",
  ].join("\n\n")

const siblingKey = (agentKey: string, suffix: string): string => {
  const lastSlash = agentKey.lastIndexOf("/")
  const base = lastSlash === -1 ? agentKey : agentKey.slice(0, lastSlash)
  return `${base}/${suffix}`
}

const executeForEach = async (call: ToolCall, origin: BlockOrigin): Promise<ToolResult<unknown>> => {
  const parsed = ForEachArgs.safeParse(call.args)
  if (!parsed.success) return { status: "error", output: `Invalid args: ${parsed.error.message}` }

  const { files, task } = parsed.data
  const mergeKey = siblingKey(origin.agent, "merge")

  if (!agents[mergeKey]) {
    return { status: "error", output: `Missing merge agent for: ${origin.agent}` }
  }

  const frozenBlocks: Block[] = getBlocksForInstances([origin.instance])
  const results: BranchResult[] = []

  for (const file of files) {
    const content = readFileChunk(file)
    if (!content) {
      results.push({ file, result: { status: "error", output: `File not found or empty: ${file}` } })
      continue
    }
    const annotations = readFileAnnotations(file)
    const context = formatBranchContext(task, file, content, annotations, results)
    const result = await startBranch(origin.agent, frozenBlocks, context)
    results.push({ file, result })
  }

  const mergeContext = formatMergeContext(task, results)
  return startBranch(mergeKey, frozenBlocks, mergeContext)
}

export const withDelegation = (base: ToolExecutor, origin?: BlockOrigin): ToolExecutor =>
  async (call) => {
    if (call.name === "delegate") return executeDelegation(call)
    if (call.name === "orchestrate" && origin) return executeOrchestrate(call, origin)
    if (call.name === "for_each" && origin) return executeForEach(call, origin)
    return base(call)
  }
