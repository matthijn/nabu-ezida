import type { State, Block, Action } from "./types"
import type { Plan, Exploration } from "./selectors"
import { getPlan, getExploration, getCurrentStep, hasActivePlan, hasActiveExploration } from "./selectors"

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

const formatFinding = (f: { direction: string; learned: string }, i: number): string =>
  `${i + 1}. [${f.direction}] ${f.learned}`

const buildExplorationNudge = (exploration: Exploration): string => {
  const header = `Exploring: ${exploration.question}`
  if (exploration.findings.length === 0) {
    const direction = exploration.currentDirection
      ? `\n\nNext: ${exploration.currentDirection}`
      : ""
    return `${header}${direction}\n\nInvestigate and call exploration_step with what you learn.`
  }
  const findingsList = exploration.findings.map(formatFinding).join("\n")
  const direction = exploration.currentDirection
    ? `\n\nNext: ${exploration.currentDirection}`
    : ""
  return `${header}\n\nFindings so far:\n${findingsList}${direction}\n\nContinue investigating, or decide: answer | plan`
}

const explorationOrchestrator: ChainableOrchestrator = (state, _block) => {
  if (hasActiveExploration(state.history)) {
    return { type: "call_llm", nudge: buildExplorationNudge(getExploration(state.history)!) }
  }
  return null
}

const planOrchestrator: ChainableOrchestrator = (state, _block) => {
  if (hasActivePlan(state.history)) {
    return { type: "call_llm", nudge: buildPlanNudge(getPlan(state.history)!, getCurrentStep(state.history)!) }
  }
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
