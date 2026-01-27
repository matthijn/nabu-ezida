import type { Block, ToolCall } from "./types"

export type Step = {
  id: string
  description: string
  done: boolean
  internal: string | null
  summary: string | null
}

export type Finding = {
  id: string
  direction: string
  internal: string | null
  learned: string
}

export type DerivedPlan = {
  task: string
  steps: Step[]
  currentStep: number | null
  aborted: boolean
}

export type DerivedExploration = {
  question: string
  findings: Finding[]
  currentDirection: string | null
  completed: boolean
}

export type Derived = {
  plans: DerivedPlan[]
  exploration: DerivedExploration | null
}

export const isToolCallBlock = (block: Block): block is { type: "tool_call"; calls: ToolCall[] } =>
  block.type === "tool_call"

export const findCall = (block: Block, name: string): ToolCall | undefined =>
  isToolCallBlock(block) ? block.calls.find((c) => c.name === name) : undefined

export const hasCall = (block: Block, name: string): boolean => findCall(block, name) !== undefined

const isCreatePlan = (call: ToolCall): boolean => call.name === "create_plan"
const isCompleteStep = (call: ToolCall): boolean => call.name === "complete_step"
const isAbort = (call: ToolCall): boolean => call.name === "abort"
const isStartExploration = (call: ToolCall): boolean => call.name === "start_exploration"
const isExplorationStep = (call: ToolCall): boolean => call.name === "exploration_step"

const findCurrentStep = (steps: Step[]): number | null => {
  const index = steps.findIndex((s) => !s.done)
  return index === -1 ? null : index
}

const markStepDone = (steps: Step[], index: number, internal: string | null, summary: string): Step[] =>
  steps.map((s, i) => (i === index ? { ...s, done: true, internal, summary } : s))

const createPlanFromCall = (call: ToolCall): DerivedPlan => {
  const steps = (call.args.steps as string[]).map((desc, i) => ({
    id: String(i + 1),
    description: desc,
    done: false,
    internal: null,
    summary: null,
  }))
  return {
    task: call.args.task as string,
    steps,
    currentStep: 0,
    aborted: false,
  }
}

const createExplorationFromCall = (call: ToolCall): DerivedExploration => ({
  question: call.args.question as string,
  findings: [],
  currentDirection: (call.args.direction as string) || null,
  completed: false,
})

const addFinding = (exploration: DerivedExploration, direction: string, internal: string | null, learned: string): DerivedExploration => ({
  ...exploration,
  findings: [...exploration.findings, { id: String(exploration.findings.length + 1), direction, internal, learned }],
})

const updateLastPlan = (plans: DerivedPlan[], fn: (p: DerivedPlan) => DerivedPlan): DerivedPlan[] => {
  if (plans.length === 0) return plans
  return [...plans.slice(0, -1), fn(plans[plans.length - 1])]
}

const processToolCall = (derived: Derived, call: ToolCall): Derived => {
  if (isAbort(call)) {
    return {
      plans: updateLastPlan(derived.plans, (p) => ({ ...p, aborted: true })),
      exploration: null,
    }
  }

  if (isCreatePlan(call)) {
    const clearExploration = derived.exploration?.completed ? derived.exploration : null
    return { plans: [...derived.plans, createPlanFromCall(call)], exploration: clearExploration }
  }

  if (isCompleteStep(call)) {
    const lastPlan = derived.plans.at(-1)
    if (!lastPlan || lastPlan.currentStep === null) return derived
    const internal = (call.args.internal as string) || null
    const summary = (call.args.summary as string) || ""
    const newSteps = markStepDone(lastPlan.steps, lastPlan.currentStep, internal, summary)
    return {
      ...derived,
      plans: updateLastPlan(derived.plans, () => ({ ...lastPlan, steps: newSteps, currentStep: findCurrentStep(newSteps) })),
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

const processBlock = (derived: Derived, block: Block): Derived => {
  if (!isToolCallBlock(block)) return derived
  return block.calls.reduce(processToolCall, derived)
}

export const derive = (history: Block[]): Derived =>
  history.reduce(processBlock, { plans: [], exploration: null })

export const lastPlan = (d: Derived): DerivedPlan | null => d.plans.at(-1) ?? null

export const hasActivePlan = (d: Derived): boolean => {
  const plan = lastPlan(d)
  return plan !== null && plan.currentStep !== null && !plan.aborted
}

export const hasActiveExploration = (d: Derived): boolean =>
  d.exploration !== null && !d.exploration.completed

export type Mode = "chat" | "plan" | "exploration"

export const getMode = (d: Derived): Mode => {
  if (hasActiveExploration(d)) return "exploration"
  if (hasActivePlan(d)) return "plan"
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
