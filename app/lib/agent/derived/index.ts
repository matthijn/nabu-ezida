import type { Block, ToolCall, ToolCallBlock } from "../types"
import {
  type DerivedPlan,
  type Files,
  planFromCall,
  processCompleteStep,
  updateLastPlan,
  hasActivePlan,
} from "./plan"

export type Derived = {
  plans: DerivedPlan[]
}

export type Mode = "chat" | "plan" | "exec"

type EnrichedToolCall = ToolCall & { succeeded: boolean }
type EnrichedToolCallBlock = { type: "tool_call"; calls: EnrichedToolCall[] }
type EnrichedBlock = Exclude<Block, ToolCallBlock> | EnrichedToolCallBlock

export const isToolCallBlock = (block: Block): block is { type: "tool_call"; calls: ToolCall[] } =>
  block.type === "tool_call"

const isEnrichedToolCallBlock = (block: EnrichedBlock): block is EnrichedToolCallBlock =>
  block.type === "tool_call"

const collectResultStatuses = (history: Block[]): Map<string, string> => {
  const statuses = new Map<string, string>()
  for (const block of history) {
    if (block.type === "tool_result") {
      const status = (block.result as { status?: string })?.status ?? "ok"
      statuses.set(block.callId, status)
    }
  }
  return statuses
}

const enrichWithResults = (history: Block[]): EnrichedBlock[] => {
  const statuses = collectResultStatuses(history)
  return history.map((block): EnrichedBlock => {
    if (block.type !== "tool_call") return block
    return {
      ...block,
      calls: block.calls.map((call) => ({
        ...call,
        succeeded: statuses.get(call.id) === "ok",
      })),
    }
  })
}

export const findCall = (block: Block, name: string): ToolCall | undefined =>
  isToolCallBlock(block) ? block.calls.find((c) => c.name === name) : undefined

export const hasCall = (block: Block, name: string): boolean => findCall(block, name) !== undefined

const isSubmitPlan = (call: EnrichedToolCall): boolean => call.name === "submit_plan"
const isCompleteStep = (call: EnrichedToolCall): boolean => call.name === "complete_step"
const isCancel = (call: EnrichedToolCall): boolean => call.name === "cancel"

const processToolCall = (derived: Derived, call: EnrichedToolCall, files: Files): Derived => {
  if (!call.succeeded) return derived

  if (isCancel(call)) {
    return {
      plans: updateLastPlan(derived.plans, (p) => ({ ...p, aborted: true })),
    }
  }

  if (isSubmitPlan(call)) {
    return { plans: [...derived.plans, planFromCall(call, files)] }
  }

  if (isCompleteStep(call)) {
    const lastPlan = derived.plans.at(-1)
    if (!lastPlan || lastPlan.currentStep === null) return derived
    const internal = (call.args.internal as string) || null
    const summary = (call.args.summary as string) || null
    return {
      ...derived,
      plans: updateLastPlan(derived.plans, (p) => processCompleteStep(p, internal, summary)),
    }
  }

  return derived
}

const processBlock = (files: Files) => (derived: Derived, block: EnrichedBlock): Derived => {
  if (!isEnrichedToolCallBlock(block)) return derived
  return block.calls.reduce((d, call) => processToolCall(d, call, files), derived)
}

export const derive = (history: Block[], files: Files = {}): Derived =>
  enrichWithResults(history).reduce(processBlock(files), { plans: [] })

export const getMode = (d: Derived): Mode => {
  if (hasActivePlan(d.plans)) return "exec"
  return "chat"
}

const isStepBoundary = (block: Block): boolean =>
  hasCall(block, "submit_plan") || hasCall(block, "complete_step")

const isAgentAction = (block: Block): boolean =>
  block.type === "text" || block.type === "tool_call"

const countActionsSinceBoundary = (history: Block[], isBoundary: (b: Block) => boolean): number => {
  let count = 0
  for (let i = history.length - 1; i >= 0; i--) {
    const block = history[i]
    if (isBoundary(block)) break
    if (isAgentAction(block)) count++
  }
  return count
}

export const isPlanPaused = (history: Block[]): boolean => {
  let foundText = false
  for (let i = history.length - 1; i >= 0; i--) {
    const block = history[i]
    if (isStepBoundary(block)) return foundText
    if (block.type === "text") foundText = true
  }
  return false
}

export const actionsSinceStepChange = (history: Block[]): number =>
  countActionsSinceBoundary(history, isStepBoundary)

export {
  type DerivedPlan,
  type Step,
  type StepDef,
  type StepDefObject,
  type StepDefNested,
  type AskExpertConfig,
  type StepGuard,
  type Files,
  lastPlan,
  hasActivePlan,
  guardCompleteStep,
} from "./plan"
