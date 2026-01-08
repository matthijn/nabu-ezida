import type { State, Block, Action } from "./types"
import { getPlan, getExploration, getCurrentStep, hasActivePlan, hasActiveExploration } from "./selectors"
import { buildPlanNudge, buildExplorationNudge } from "./prompts"

type ChainableOrchestrator = (state: State, block: Block) => Action | null
type FinalOrchestrator = (state: State, block: Block) => Action

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
