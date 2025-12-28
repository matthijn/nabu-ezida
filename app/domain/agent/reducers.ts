import type { AgentState, AgentMessage, Plan, Step } from "./types"

export const createInitialState = (): AgentState => ({
  mode: "converse",
  messages: [],
  plan: null,
  currentStep: null,
})

export const applyMessage = (state: AgentState, msg: AgentMessage): AgentState => {
  const messages = [...state.messages, msg]

  switch (msg.type) {
    case "plan":
      return {
        ...state,
        messages,
        mode: "task",
        plan: msg.plan,
        currentStep: 0,
      }

    case "step_start": {
      if (!state.plan) return { ...state, messages }
      const updatedSteps = updateStepStatus(state.plan.steps, msg.stepIndex, "in_progress")
      return {
        ...state,
        messages,
        plan: { ...state.plan, steps: updatedSteps },
        currentStep: msg.stepIndex,
      }
    }

    case "step_done": {
      if (!state.plan) return { ...state, messages }
      const updatedSteps = updateStepStatus(state.plan.steps, msg.stepIndex, "done")
      return {
        ...state,
        messages,
        plan: { ...state.plan, steps: updatedSteps },
      }
    }

    case "error": {
      if (!state.plan || state.currentStep === null) return { ...state, messages }
      const updatedSteps = updateStepStatus(state.plan.steps, state.currentStep, "error")
      return {
        ...state,
        messages,
        plan: { ...state.plan, steps: updatedSteps },
      }
    }

    case "done":
      return {
        ...state,
        messages,
        mode: "converse",
        plan: null,
        currentStep: null,
      }

    default:
      return { ...state, messages }
  }
}

const updateStepStatus = (steps: Step[], index: number, status: Step["status"]): Step[] =>
  steps.map((step, i) => (i === index ? { ...step, status } : step))

export const isStepInProgress = (state: AgentState): boolean =>
  state.mode === "task" && state.currentStep !== null

export const getCurrentStep = (state: AgentState): Step | null => {
  if (!state.plan || state.currentStep === null) return null
  return state.plan.steps[state.currentStep] ?? null
}

export const hasMoreSteps = (state: AgentState): boolean => {
  if (!state.plan || state.currentStep === null) return false
  return state.currentStep < state.plan.steps.length - 1
}

export const getNextStepIndex = (state: AgentState): number | null => {
  if (!hasMoreSteps(state)) return null
  return state.currentStep! + 1
}
