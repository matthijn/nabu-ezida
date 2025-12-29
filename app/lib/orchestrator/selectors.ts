import type { AgentState } from "./types"

export const selectCurrentStepIndex = (state: AgentState): number | null => {
  if (!state.plan) return null
  const idx = state.plan.steps.findIndex((s) => s.status !== "done")
  return idx === -1 ? null : idx
}

export const selectEndpoint = (state: AgentState): string => {
  const stepIndex = selectCurrentStepIndex(state)
  if (state.mode === "task" && stepIndex !== null) {
    return "/chat/execute"
  }
  if (state.mode === "task" && state.plan === null) {
    return "/chat/plan"
  }
  return "/chat/converse"
}

