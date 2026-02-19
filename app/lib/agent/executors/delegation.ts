import { getToolHandlers } from "./tool"
import { createExecutor } from "./execute"
import type { ToolCall, ToolResult, Block, BlockOrigin } from "../types"
import type { ToolExecutor } from "../turn"
import { createInstance } from "../types"
import { agents } from "./agents"
import { pushBlocks, tagBlocks, getBlocksForInstances, subscribeBlocks, setActiveOrigin } from "../block-store"
import { getStreamingCallbacks, getStreamingSignal, getSetLoading } from "../streaming-context"
import { agentLoop } from "../agent-loop"
import { getFiles } from "~/lib/files/store"
import { derive, lastPlan, guardCompleteStep, guardCompleteSubstep } from "../derived"

export type TaskContext = {
  intent: string
  context?: string
}

export type BranchResult = { file: string; result: ToolResult<unknown> }

export type DelegationHandler = (call: { args: unknown }, origin?: BlockOrigin) => Promise<ToolResult<unknown>>

const delegationHandlers = new Map<string, DelegationHandler>()

export const registerDelegationHandler = (name: string, handler: DelegationHandler): void => {
  delegationHandlers.set(name, handler)
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

export const siblingKey = (agentKey: string, suffix: string): string => {
  const lastSlash = agentKey.lastIndexOf("/")
  const base = lastSlash === -1 ? agentKey : agentKey.slice(0, lastSlash)
  return `${base}/${suffix}`
}

type RunAgentOptions = {
  interactive: boolean
  canWait?: boolean
}

const isPlanComplete = (origin: BlockOrigin): boolean => {
  const blocks = getBlocksForInstances([origin.instance])
  const d = derive(blocks, getFiles())
  const plan = lastPlan(d.plans)
  return plan !== null && plan.currentStep === null && !plan.aborted
}

const compactAndReturn = async (agentKey: string, origin: BlockOrigin): Promise<ToolResult<unknown>> => {
  const compactKey = siblingKey(agentKey, "compact")
  if (!agents[compactKey]) return { status: "ok", output: "Plan complete" }
  const blocks = getBlocksForInstances([origin.instance])
  const summary = blocks
    .filter((b) => b.type === "text" || (b.type === "tool_result" && b.toolName === "complete_step"))
    .map((b) => "content" in b ? b.content : JSON.stringify((b as { result: unknown }).result))
    .join("\n")
  return startPhase(compactKey, summary)
}

export const runAgent = async (agentKey: string, origin: BlockOrigin, options: RunAgentOptions): Promise<ToolResult<unknown>> => {
  const { interactive, canWait = interactive } = options
  const agent = agents[agentKey]
  if (!agent) return { status: "error", output: `Unknown agent: ${agentKey}` }

  const effectiveAgent = interactive ? agent : { ...agent, interactive: false }
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
    if (!interactive) return { status: "error", output: "Non-interactive agent ended without text" }
    if (isPlanComplete(origin)) return compactAndReturn(agentKey, origin)
    if (!canWait) return { status: "error", output: "Branch ended without completing plan" }
    getSetLoading()?.(false)
    await waitForUser(origin, signal)
    getSetLoading()?.(true)
  }
}

export const startPhase = async (agentKey: string, context: string): Promise<ToolResult<unknown>> => {
  const agent = agents[agentKey]
  if (!agent) return { status: "error", output: `Unknown agent: ${agentKey}` }

  const origin: BlockOrigin = { agent: agentKey, instance: createInstance(agentKey) }
  pushBlocks(tagBlocks(origin, [{ type: "system", content: context }]))
  return runAgent(agentKey, origin, { interactive: agent.interactive })
}

export const startBranch = async (agentKey: string, frozenBlocks: Block[], context: string): Promise<ToolResult<unknown>> => {
  const agent = agents[agentKey]
  if (!agent) return { status: "error", output: `Unknown agent: ${agentKey}` }

  const origin: BlockOrigin = { agent: agentKey, instance: createInstance(agentKey) }
  const history = tagBlocks(origin, frozenBlocks)
  pushBlocks([...history, ...tagBlocks(origin, [{ type: "system", content: context }])])
  return runAgent(agentKey, origin, { interactive: true, canWait: false })
}

export const formatPriorResults = (results: BranchResult[]): string =>
  ["## Prior Results", ...results.map(formatBranchResult)].join("\n\n")

const formatBranchResult = (r: BranchResult): string =>
  `### ${r.file}\n${JSON.stringify(r.result.output)}`

export const formatBranchContext = (task: string, file: string, content: string, annotations: string, priorResults: BranchResult[]): string =>
  [
    `# Task\n${task}`,
    `## File: ${file}\n${content}`,
    annotations && `## Annotations\n${annotations}`,
    priorResults.length > 0 && formatPriorResults(priorResults),
  ].filter(Boolean).join("\n\n")

export const formatCompactContext = (task: string, results: BranchResult[]): string =>
  [
    "# Compact Results",
    `**Original task:** ${task}`,
    `**Files processed:** ${results.length}`,
    formatPriorResults(results),
    "Write a concise summary of what was accomplished, what was found, and what remains open.",
  ].join("\n\n")

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
    const handler = delegationHandlers.get(call.name)
    if (handler) return handler(call, origin)
    if (isStepGuarded(call.name) && origin) {
      const guardResult = checkStepGuard(call, origin)
      if (guardResult) return guardResult
    }
    return base(call)
  }
