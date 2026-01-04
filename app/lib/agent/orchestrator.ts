import type { State, Block, Action, Plan, Exploration } from "./types"
import { getCurrentStep, hasActiveExploration } from "./types"

type ChainableOrchestrator = (state: State, block: Block) => Action | null
type FinalOrchestrator = (state: State, block: Block) => Action

const formatStep = (s: { description: string; done: boolean }, i: number): string => {
  const status = s.done ? "done" : "pending"
  return `${i + 1}. [${status}] ${s.description}`
}

const buildPlanNudge = (plan: Plan, stepIndex: number): string => {
  const stepList = plan.steps.map(formatStep).join("\n")
  const step = plan.steps[stepIndex]
  return `Plan:\n${stepList}\n\nContinue with step ${stepIndex + 1}: ${step.description}`
}

const formatFinding = (f: { learned: string }, i: number): string => `${i + 1}. ${f.learned}`

const buildExplorationNudge = (exploration: Exploration): string => {
  const header = `Exploring: ${exploration.question}`
  if (exploration.findings.length === 0) {
    return `${header}\n\nInvestigate and call exploration_step with what you learn.`
  }
  const findingsList = exploration.findings.map(formatFinding).join("\n")
  return `${header}\n\nFindings so far:\n${findingsList}\n\nContinue investigating, or decide: answer | plan`
}

const hasPendingPlanStep = (state: State): boolean => {
  const step = getCurrentStep(state)
  return state.plan !== null && step !== null
}

const explorationOrchestrator: ChainableOrchestrator = (state, _block) => {
  if (hasActiveExploration(state)) return { type: "call_llm", nudge: buildExplorationNudge(state.exploration!) }
  return null
}

const planOrchestrator: ChainableOrchestrator = (state, _block) => {
  if (hasPendingPlanStep(state)) return { type: "call_llm", nudge: buildPlanNudge(state.plan!, getCurrentStep(state)!) }
  return null
}

const isToolResult = (block: Block): boolean => block.type === "tool_result"

const toolResultOrchestrator: ChainableOrchestrator = (_state, block) => {
  if (isToolResult(block)) return { type: "call_llm", nudge: "" }
  return null
}

const combine = (...orchestrators: ChainableOrchestrator[]): FinalOrchestrator => (state, block) => {
  for (const orch of orchestrators) {
    const action = orch(state, block)
    if (action) return action
  }
  return { type: "done" }
}

export const orchestrator = combine(toolResultOrchestrator, explorationOrchestrator, planOrchestrator)
