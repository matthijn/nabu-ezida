import type { State, Block, Action, Plan } from "./types"

type ChainableOrchestrator = (state: State, block: Block) => Action | null
type FinalOrchestrator = (state: State, block: Block) => Action

const isPlanComplete = (plan: Plan | null): boolean => {
  if (!plan) return true
  return plan.steps.every((s) => s.done)
}

const formatStep = (s: { description: string; done: boolean }, i: number): string => {
  const status = s.done ? "done" : "pending"
  return `${i + 1}. [${status}] ${s.description}`
}

const buildNudge = (plan: Plan, stepIndex: number): string => {
  const stepList = plan.steps.map(formatStep).join("\n")
  const step = plan.steps[stepIndex]
  return `Plan:\n${stepList}\n\nContinue with step ${stepIndex + 1}: ${step.description}`
}

const planOrchestrator: ChainableOrchestrator = (state, _block) => {
  if (state.mode !== "exec") return null
  if (!state.plan) return null
  if (isPlanComplete(state.plan)) return { type: "done" }
  if (state.currentStep === null) return { type: "done" }
  if (state.pendingToolCalls) return null

  const nudge = buildNudge(state.plan, state.currentStep)
  return { type: "call_llm", nudge }
}

const defaultOrchestrator: FinalOrchestrator = () => ({ type: "done" })

const combine = (...orchestrators: ChainableOrchestrator[]): FinalOrchestrator => (state, block) => {
  for (const orch of orchestrators) {
    const action = orch(state, block)
    if (action) return action
  }
  return { type: "done" }
}

export const orchestrator = combine(planOrchestrator, defaultOrchestrator)
