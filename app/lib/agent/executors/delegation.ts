import { getToolHandlers } from "./tool"
import { createExecutor } from "./execute"
import { TaskArgs, ExecuteWithPlanArgs, ForEachArgs } from "./delegation-tools"
import type { ToolCall, ToolResult, Block, BlockOrigin } from "../types"
import type { ToolExecutor } from "../turn"
import { createInstance } from "../types"
import { agents } from "./agents"
import { pushBlocks, tagBlocks, getBlocksForInstances, subscribeBlocks, setActiveOrigin } from "../block-store"
import { getStreamingCallbacks, getStreamingSignal, getSetLoading } from "../streaming-context"
import { agentLoop } from "../agent-loop"
import { getFileRaw, getStoredAnnotations } from "~/lib/files"
import { filterMatchingAnnotations } from "~/domain/attributes/annotations"
import { stripAttributesBlock } from "~/lib/text/markdown"

export type TaskContext = {
  intent: string
  context?: string
}

export const formatTaskContext = (args: TaskContext): string =>
  [
    "# Delegated Task",
    `**Intent:** ${args.intent}`,
    args.context && `**Context:** ${args.context}`,
  ].filter(Boolean).join("\n")

const countInstanceBlocks = (instance: string): number =>
  getBlocksForInstances([instance]).length

const waitForUser = (origin: BlockOrigin, signal?: AbortSignal): Promise<void> => {
  setActiveOrigin(origin)
  const before = countInstanceBlocks(origin.instance)
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) { reject(signal.reason); return }

    const cleanup = () => {
      unsub()
      if (signal) signal.removeEventListener("abort", onAbort)
    }

    const unsub = subscribeBlocks(() => {
      if (countInstanceBlocks(origin.instance) > before) {
        cleanup()
        resolve()
      }
    })

    const onAbort = () => {
      cleanup()
      reject(signal!.reason)
    }

    if (signal) signal.addEventListener("abort", onAbort, { once: true })
  })
}

const buildExecutor = (origin: BlockOrigin): ToolExecutor =>
  withDelegation(createExecutor(getToolHandlers()), origin)

const runAgent = async (agentKey: string, origin: BlockOrigin, chat: boolean): Promise<ToolResult<unknown>> => {
  const agent = agents[agentKey]
  if (!agent) return { status: "error", output: `Unknown agent: ${agentKey}` }

  const effectiveAgent = chat ? agent : { ...agent, chat: false }
  const executor = buildExecutor(origin)
  const signal = getStreamingSignal()

  while (true) {
    const result = await agentLoop({
      origin,
      agent: effectiveAgent,
      executor,
      callbacks: getStreamingCallbacks(),
      signal,
    })
    if (result) return result
    if (!effectiveAgent.chat) return { status: "error", output: "Agent ended without resolve/reject" }
    getSetLoading()?.(false)
    await waitForUser(origin, signal)
    getSetLoading()?.(true)
  }
}

const startPhase = async (agentKey: string, context: string): Promise<ToolResult<unknown>> => {
  const agent = agents[agentKey]
  if (!agent) return { status: "error", output: `Unknown agent: ${agentKey}` }

  const origin: BlockOrigin = { agent: agentKey, instance: createInstance(agentKey) }
  pushBlocks(tagBlocks(origin, [{ type: "system", content: context }]))
  return runAgent(agentKey, origin, agent.chat)
}

const startBranch = async (agentKey: string, frozenBlocks: Block[], context: string): Promise<ToolResult<unknown>> => {
  const agent = agents[agentKey]
  if (!agent) return { status: "error", output: `Unknown agent: ${agentKey}` }

  const origin: BlockOrigin = { agent: agentKey, instance: createInstance(agentKey) }
  const history = tagBlocks(origin, frozenBlocks)
  pushBlocks([...history, ...tagBlocks(origin, [{ type: "system", content: context }])])
  return runAgent(agentKey, origin, false)
}

const executeDelegation = async (call: ToolCall): Promise<ToolResult<unknown>> => {
  const parsed = TaskArgs.safeParse(call.args)
  if (!parsed.success) return { status: "error", output: `Invalid args: ${parsed.error.message}` }

  const { who, ...fields } = parsed.data
  return startPhase(who, formatTaskContext(fields))
}

const executeWithPlan = async (call: ToolCall, origin: BlockOrigin): Promise<ToolResult<unknown>> => {
  const parsed = ExecuteWithPlanArgs.safeParse(call.args)
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

export type BranchResult = { file: string; result: ToolResult<unknown> }

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

export const formatBranchContext = (task: string, file: string, content: string, annotations: string, priorResults: BranchResult[]): string =>
  [
    `# Task\n${task}`,
    `## File: ${file}\n${content}`,
    annotations && `## Annotations\n${annotations}`,
    priorResults.length > 0 && formatPriorResults(priorResults),
  ].filter(Boolean).join("\n\n")

export const formatPriorResults = (results: BranchResult[]): string =>
  ["## Prior Results", ...results.map(formatBranchResult)].join("\n\n")

const formatBranchResult = (r: BranchResult): string =>
  `### ${r.file}\n${JSON.stringify(r.result.output)}`

export const formatMergeContext = (task: string, results: BranchResult[]): string =>
  [
    "# Merge Results",
    `**Original task:** ${task}`,
    `**Files processed:** ${results.length}`,
    formatPriorResults(results),
    "Summarize the results into a single resolve or reject.",
  ].join("\n\n")

export const siblingKey = (agentKey: string, suffix: string): string => {
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
    if (call.name === "execute_with_plan" && origin) return executeWithPlan(call, origin)
    if (call.name === "for_each" && origin) return executeForEach(call, origin)
    return base(call)
  }
