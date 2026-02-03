import type { Block, ToolCall, ToolCallBlock } from "../types"
import {
  type DerivedPlan,
  type Files,
  createPlanFromCall,
  processCompleteStep,
  updateLastPlan,
  hasActivePlan,
} from "./plan"
import {
  type DerivedExploration,
  createExplorationFromCall,
  addFinding,
  hasActiveExploration,
} from "./exploration"

export type Derived = {
  plans: DerivedPlan[]
  exploration: DerivedExploration | null
}

export type Mode = "chat" | "plan" | "exploration"

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

const isCreatePlan = (call: EnrichedToolCall): boolean => call.name === "create_plan"
const isCompleteStep = (call: EnrichedToolCall): boolean => call.name === "complete_step"
const isAbort = (call: EnrichedToolCall): boolean => call.name === "abort"
const isStartExploration = (call: EnrichedToolCall): boolean => call.name === "start_exploration"
const isExplorationStep = (call: EnrichedToolCall): boolean => call.name === "exploration_step"

const processToolCall = (derived: Derived, call: EnrichedToolCall, files: Files): Derived => {
  if (!call.succeeded) return derived

  if (isAbort(call)) {
    return {
      plans: updateLastPlan(derived.plans, (p) => ({ ...p, aborted: true })),
      exploration: null,
    }
  }

  if (isCreatePlan(call)) {
    const clearExploration = derived.exploration?.completed ? derived.exploration : null
    return { plans: [...derived.plans, createPlanFromCall(call, files)], exploration: clearExploration }
  }

  if (isCompleteStep(call)) {
    const lastPlan = derived.plans.at(-1)
    if (!lastPlan || lastPlan.currentStep === null) return derived
    const internal = (call.args.internal as string) || null
    const summary = (call.args.summary as string) || ""
    return {
      ...derived,
      plans: updateLastPlan(derived.plans, (p) => processCompleteStep(p, internal, summary)),
    }
  }

  if (isStartExploration(call)) {
    return { ...derived, exploration: createExplorationFromCall(call) }
  }

  if (isExplorationStep(call) && derived.exploration && !derived.exploration.completed) {
    const direction = derived.exploration.currentDirection || ""
    const internal = (call.args.internal as string) || null
    const learned = call.args.learned as string
    const decision = call.args.decision as string
    const next = call.args.next as string | undefined
    const withFinding = addFinding(derived.exploration, direction, internal, learned)

    if (decision === "answer" || decision === "plan") {
      return { ...derived, exploration: { ...withFinding, currentDirection: null, completed: true } }
    }
    return { ...derived, exploration: { ...withFinding, currentDirection: next || null } }
  }

  return derived
}

const processBlock = (files: Files) => (derived: Derived, block: EnrichedBlock): Derived => {
  if (!isEnrichedToolCallBlock(block)) return derived
  return block.calls.reduce((d, call) => processToolCall(d, call, files), derived)
}

export const derive = (history: Block[], files: Files = {}): Derived =>
  enrichWithResults(history).reduce(processBlock(files), { plans: [], exploration: null })

export const getMode = (d: Derived): Mode => {
  if (hasActiveExploration(d.exploration)) return "exploration"
  if (hasActivePlan(d.plans)) return "plan"
  return "chat"
}

const isStepBoundary = (block: Block): boolean =>
  hasCall(block, "create_plan") || hasCall(block, "complete_step")

const isExplorationBoundary = (block: Block): boolean =>
  hasCall(block, "start_exploration") || hasCall(block, "exploration_step")

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

export const actionsSinceStepChange = (history: Block[]): number =>
  countActionsSinceBoundary(history, isStepBoundary)

export const actionsSinceExplorationChange = (history: Block[]): number =>
  countActionsSinceBoundary(history, isExplorationBoundary)

// Re-export types and selectors from sub-modules
export {
  type DerivedPlan,
  type Step,
  type StepDef,
  type StepDefObject,
  type StepDefPerSection,
  type Section,
  type SectionResult,
  type PerSectionConfig,
  type ThinkHard,
  type Files,
  lastPlan,
  hasActivePlan,
} from "./plan"

export {
  type DerivedExploration,
  type Finding,
  hasActiveExploration,
} from "./exploration"
