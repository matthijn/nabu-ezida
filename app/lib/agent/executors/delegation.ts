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
import { getFiles } from "~/lib/files/store"
import { derive, lastPlan, guardCompleteStep, guardCompleteSubstep } from "../derived"
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

const synthesizeCreatePlan = (planData: Record<string, unknown>): Block[] => {
  const callId = `synth-${Date.now()}`
  return [
    { type: "tool_call", calls: [{ id: callId, name: "create_plan", args: planData }] },
    { type: "tool_result", callId, result: { status: "ok" } },
  ]
}

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

  const planOutput = planResult.output as { outcome: string; artifacts?: string[] }
  const planData = JSON.parse(planOutput.outcome) as Record<string, unknown>

  const execOrigin: BlockOrigin = { agent: execKey, instance: createInstance(execKey) }
  const planBlocks = synthesizeCreatePlan(planData)
  pushBlocks(tagBlocks(execOrigin, [
    { type: "system", content: taskContext },
    ...planBlocks,
  ]))
  return runAgent(execKey, execOrigin, agents[execKey].chat)
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

const isStepGuarded = (name: string): boolean =>
  name === "complete_step" || name === "complete_substep"

const guardMap = { complete_step: guardCompleteStep, complete_substep: guardCompleteSubstep } as const

const checkStepGuard = (call: ToolCall, origin: BlockOrigin): ToolResult<unknown> | null => {
  const guardFn = guardMap[call.name as keyof typeof guardMap]
  if (!guardFn) return null

  const blocks = getBlocksForInstances([origin.instance])
  const d = derive(blocks, getFiles())
  const plan = lastPlan(d.plans)
  if (!plan) return null

  const guard = guardFn(plan)
  if (guard.allowed) return null
  return { status: "error", output: guard.reason }
}

export const withDelegation = (base: ToolExecutor, origin?: BlockOrigin): ToolExecutor =>
  async (call) => {
    if (call.name === "delegate") return executeDelegation(call)
    if (call.name === "execute_with_plan" && origin) return executeWithPlan(call, origin)
    if (call.name === "for_each" && origin) return executeForEach(call, origin)
    if (isStepGuarded(call.name) && origin) {
      const guardResult = checkStepGuard(call, origin)
      if (guardResult) return guardResult
    }
    return base(call)
  }
