import type { State, Block, Plan, Step, ToolCall, Exploration, Finding } from "./types"
import { getCurrentStep } from "./types"

const isCreatePlan = (call: ToolCall): boolean => call.name === "create_plan"
const isCompleteStep = (call: ToolCall): boolean => call.name === "complete_step"
const isAbort = (call: ToolCall): boolean => call.name === "abort"
const isStartExploration = (call: ToolCall): boolean => call.name === "start_exploration"
const isExplorationStep = (call: ToolCall): boolean => call.name === "exploration_step"

const createPlanFromCall = (call: ToolCall): Plan => ({
  task: call.args.task as string,
  steps: (call.args.steps as string[]).map((desc, i) => ({
    id: String(i + 1),
    description: desc,
    done: false,
  })),
})

const createExplorationFromCall = (call: ToolCall): Exploration => ({
  question: call.args.question as string,
  findings: [],
})

const addFinding = (exploration: Exploration, learned: string): Exploration => ({
  ...exploration,
  findings: [...exploration.findings, { id: String(exploration.findings.length + 1), learned }],
})

const markStepDone = (steps: Step[], index: number): Step[] =>
  steps.map((s, i) => (i === index ? { ...s, done: true } : s))

const appendHistory = (state: State, block: Block): State => ({
  ...state,
  history: [...state.history, block],
})

const handleTextBlock = (state: State, block: Block): State => appendHistory(state, block)

const handleToolCallBlock = (state: State, block: Block): State => {
  if (block.type !== "tool_call") return state

  let newState = appendHistory(state, block)

  for (const call of block.calls) {
    if (isAbort(call)) {
      newState = { ...newState, plan: null, exploration: null }
    }

    if (isCreatePlan(call)) {
      newState = { ...newState, plan: createPlanFromCall(call), exploration: null }
    }

    const currentStep = getCurrentStep(newState)
    if (isCompleteStep(call) && newState.plan && currentStep !== null) {
      const updatedSteps = markStepDone(newState.plan.steps, currentStep)
      newState = { ...newState, plan: { ...newState.plan, steps: updatedSteps } }
    }

    if (isStartExploration(call)) {
      newState = { ...newState, exploration: createExplorationFromCall(call) }
    }

    if (isExplorationStep(call) && newState.exploration) {
      const learned = call.args.learned as string
      const decision = call.args.decision as string
      newState = { ...newState, exploration: addFinding(newState.exploration, learned) }
      if (decision === "answer" || decision === "plan") {
        newState = { ...newState, exploration: null }
      }
    }
  }

  return newState
}

const handleToolResultBlock = (state: State, block: Block): State => appendHistory(state, block)

const handleUserBlock = (state: State, block: Block): State => appendHistory(state, block)

const handleSystemBlock = (state: State, block: Block): State => appendHistory(state, block)

const handlers: Record<Block["type"], (state: State, block: Block) => State> = {
  text: handleTextBlock,
  tool_call: handleToolCallBlock,
  tool_result: handleToolResultBlock,
  user: handleUserBlock,
  system: handleSystemBlock,
}

export const reducer = (state: State, block: Block): State => handlers[block.type](state, block)
