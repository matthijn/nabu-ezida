import type { AgentState } from "~/domain/agent"

export const selectEndpoint = (state: AgentState): string => {
  if (state.mode === "task" && state.currentStep !== null) {
    return "/chat/execute"
  }
  if (state.mode === "task" && state.plan === null) {
    return "/chat/plan"
  }
  return "/chat/converse"
}

export const selectTools = (state: AgentState): string[] => {
  if (state.mode === "task" && state.currentStep !== null) {
    return ["read_file", "edit_file", "run_command"]
  }
  return []
}
