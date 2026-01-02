import type { State, Block, Plan, Step, ToolCall } from "./types"

const isCreatePlan = (call: ToolCall): boolean => call.name === "create_plan"
const isCompleteStep = (call: ToolCall): boolean => call.name === "complete_step"

const createPlanFromCall = (call: ToolCall): Plan => ({
  task: call.args.task as string,
  steps: (call.args.steps as string[]).map((desc, i) => ({
    id: String(i + 1),
    description: desc,
    done: false,
  })),
})

const markStepDone = (steps: Step[], index: number): Step[] =>
  steps.map((s, i) => (i === index ? { ...s, done: true } : s))

const findCurrentStep = (plan: Plan): number | null => {
  const idx = plan.steps.findIndex((s) => !s.done)
  return idx === -1 ? null : idx
}

const appendHistory = (state: State, block: Block): State => ({
  ...state,
  history: [...state.history, block],
})

const handleTextBlock = (state: State, block: Block): State => appendHistory(state, block)

const handleToolCallBlock = (state: State, block: Block): State => {
  if (block.type !== "tool_call") return state

  const calls = block.calls
  let newState = appendHistory(state, block)
  newState = { ...newState, pendingToolCalls: calls }

  for (const call of calls) {
    if (isCreatePlan(call)) {
      const plan = createPlanFromCall(call)
      newState = {
        ...newState,
        mode: "exec",
        plan,
        currentStep: 0,
      }
    }

    if (isCompleteStep(call) && newState.plan && newState.currentStep !== null) {
      const updatedSteps = markStepDone(newState.plan.steps, newState.currentStep)
      const updatedPlan = { ...newState.plan, steps: updatedSteps }
      const nextStep = findCurrentStep(updatedPlan)
      newState = {
        ...newState,
        plan: updatedPlan,
        currentStep: nextStep,
      }
    }
  }

  return newState
}

const handleToolResultBlock = (state: State, block: Block): State => {
  if (block.type !== "tool_result") return state

  let newState = appendHistory(state, block)

  if (newState.pendingToolCalls) {
    const remaining = newState.pendingToolCalls.filter((c) => c.id !== block.callId)
    newState = {
      ...newState,
      pendingToolCalls: remaining.length > 0 ? remaining : null,
    }
  }

  return newState
}

const handlers: Record<Block["type"], (state: State, block: Block) => State> = {
  text: handleTextBlock,
  tool_call: handleToolCallBlock,
  tool_result: handleToolResultBlock,
}

export const reducer = (state: State, block: Block): State => handlers[block.type](state, block)

export const findCurrentStepIndex = findCurrentStep
