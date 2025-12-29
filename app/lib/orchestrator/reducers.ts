import type { AgentState, AgentMessage, Step } from "./types"
import { selectCurrentStepIndex } from "./selectors"

export const createInitialState = (): AgentState => ({
  mode: "converse",
  messages: [],
  plan: null,
  compactions: [],
  compactedUpTo: 0,
})

export const applyMessage = (state: AgentState, msg: AgentMessage): AgentState => {
  const messages = [...state.messages, msg]

  switch (msg.type) {
    case "task_detected":
      return { ...state, messages, mode: "task" }

    case "plan":
      return { ...state, messages, plan: msg.plan }

    case "step_start": {
      if (!state.plan) return { ...state, messages }
      return {
        ...state,
        messages,
        plan: { ...state.plan, steps: updateStepStatus(state.plan.steps, msg.stepIndex, "in_progress") },
      }
    }

    case "step_done": {
      if (!state.plan) return { ...state, messages }
      return {
        ...state,
        messages,
        plan: { ...state.plan, steps: updateStepStatus(state.plan.steps, msg.stepIndex, "done") },
      }
    }

    case "error": {
      const stepIndex = selectCurrentStepIndex(state)
      if (!state.plan || stepIndex === null) return { ...state, messages }
      return {
        ...state,
        messages,
        plan: { ...state.plan, steps: updateStepStatus(state.plan.steps, stepIndex, "error") },
      }
    }

    case "done":
      return { ...state, messages, mode: "converse", plan: null }

    case "compacted":
      return {
        ...state,
        messages,
        compactions: msg.compactions,
        compactedUpTo: messages.length,
      }

    case "text":
    case "thinking":
    case "stuck":
      return { ...state, messages }

    default: {
      const _exhaustive: never = msg
      throw new Error(`Unknown message type: ${(_exhaustive as AgentMessage).type}`)
    }
  }
}

const updateStepStatus = (steps: Step[], index: number, status: Step["status"]): Step[] =>
  steps.map((step, i) => (i === index ? { ...step, status } : step))

export const getCurrentStep = (state: AgentState): Step | null => {
  const idx = selectCurrentStepIndex(state)
  if (idx === null || !state.plan) return null
  return state.plan.steps[idx] ?? null
}