import type { Block, ToolCall } from "./types"

export type Step = {
  id: string
  description: string
  done: boolean
}

export type Plan = {
  task: string
  steps: Step[]
}

export type Finding = {
  id: string
  direction: string
  learned: string
}

export type Exploration = {
  question: string
  findings: Finding[]
  currentDirection: string | null
}

export type DerivedState = {
  plan: Plan | null
  exploration: Exploration | null
}

const isToolCallBlock = (block: Block): block is { type: "tool_call"; calls: ToolCall[] } =>
  block.type === "tool_call"

const isCreatePlan = (call: ToolCall): boolean => call.name === "create_plan"
const isCompleteStep = (call: ToolCall): boolean => call.name === "complete_step"
const isAbort = (call: ToolCall): boolean => call.name === "abort"
const isStartExploration = (call: ToolCall): boolean => call.name === "start_exploration"
const isExplorationStep = (call: ToolCall): boolean => call.name === "exploration_step"

const createPlanFromCall = (call: ToolCall): Plan => ({
  task: call.args.task as string,
  steps: (call.args.steps as string[]).map((desc, i) => ({
    id: String(i + 1),
    description: desc,
    done: false,
  })),
})

const createExplorationFromCall = (call: ToolCall): Exploration => ({
  question: call.args.question as string,
  findings: [],
  currentDirection: (call.args.direction as string) || null,
})

const markStepDone = (steps: Step[], index: number): Step[] =>
  steps.map((s, i) => (i === index ? { ...s, done: true } : s))

const findCurrentStep = (plan: Plan): number | null => {
  const index = plan.steps.findIndex(s => !s.done)
  return index === -1 ? null : index
}

const addFinding = (exploration: Exploration, direction: string, learned: string): Exploration => ({
  ...exploration,
  findings: [...exploration.findings, { id: String(exploration.findings.length + 1), direction, learned }],
})

const processToolCall = (derived: DerivedState, call: ToolCall): DerivedState => {
  if (isAbort(call)) {
    return { plan: null, exploration: null }
  }

  if (isCreatePlan(call)) {
    return { ...derived, plan: createPlanFromCall(call), exploration: null }
  }

  if (isCompleteStep(call) && derived.plan) {
    const currentStep = findCurrentStep(derived.plan)
    if (currentStep !== null) {
      return { ...derived, plan: { ...derived.plan, steps: markStepDone(derived.plan.steps, currentStep) } }
    }
  }

  if (isStartExploration(call)) {
    return { ...derived, exploration: createExplorationFromCall(call) }
  }

  if (isExplorationStep(call) && derived.exploration) {
    const direction = derived.exploration.currentDirection || ""
    const learned = call.args.learned as string
    const decision = call.args.decision as string
    const next = call.args.next as string | undefined
    const withFinding = addFinding(derived.exploration, direction, learned)

    if (decision === "answer" || decision === "plan") {
      return { ...derived, exploration: null }
    }
    return { ...derived, exploration: { ...withFinding, currentDirection: next || null } }
  }

  return derived
}

const processBlock = (derived: DerivedState, block: Block): DerivedState => {
  if (!isToolCallBlock(block)) return derived
  return block.calls.reduce(processToolCall, derived)
}

export const deriveState = (history: Block[]): DerivedState =>
  history.reduce(processBlock, { plan: null, exploration: null })

export const getPlan = (history: Block[]): Plan | null => deriveState(history).plan

export const getExploration = (history: Block[]): Exploration | null => deriveState(history).exploration

export const getCurrentStep = (history: Block[]): number | null => {
  const { plan } = deriveState(history)
  return plan ? findCurrentStep(plan) : null
}

export const hasActivePlan = (history: Block[]): boolean => {
  const { plan } = deriveState(history)
  return plan !== null && findCurrentStep(plan) !== null
}

export const hasActiveExploration = (history: Block[]): boolean => deriveState(history).exploration !== null

export type Mode = "chat" | "plan" | "exploration"

export const getMode = (history: Block[]): Mode => {
  const { plan, exploration } = deriveState(history)
  if (exploration !== null) return "exploration"
  if (plan !== null && findCurrentStep(plan) !== null) return "plan"
  return "chat"
}
