import type { AgentState, AgentMessage } from "./types"

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

export const selectUncompactedMessages = (state: AgentState): AgentMessage[] =>
  state.messages.slice(state.compactedUpTo)

export const hasUncompactedMessages = (state: AgentState): boolean =>
  state.messages.length > state.compactedUpTo

