export type ToolCall = {
  id: string
  name: string
  args: Record<string, unknown>
}

export type TextBlock = {
  type: "text"
  content: string
}

export type ToolCallBlock = {
  type: "tool_call"
  calls: ToolCall[]
}

export type ToolResultBlock = {
  type: "tool_result"
  callId: string
  result: unknown
}

export type UserBlock = {
  type: "user"
  content: string
}

export type SystemBlock = {
  type: "system"
  content: string
}

export type Block = TextBlock | ToolCallBlock | ToolResultBlock | UserBlock | SystemBlock

export type Step = {
  id: string
  description: string
  done: boolean
}

export type Plan = {
  task: string
  steps: Step[]
}

export type Finding = {
  id: string
  learned: string
}

export type Exploration = {
  question: string
  findings: Finding[]
}

export type State = {
  plan: Plan | null
  exploration: Exploration | null
  history: Block[]
}

export type CallLLMAction = {
  type: "call_llm"
  nudge: string
}

export type DoneAction = {
  type: "done"
}

export type Action = CallLLMAction | DoneAction

export const initialState: State = {
  plan: null,
  exploration: null,
  history: [],
}

export const hasActivePlan = (state: State): boolean => state.plan !== null

export const getCurrentStep = (state: State): number | null => {
  if (!state.plan) return null
  const idx = state.plan.steps.findIndex((step) => !step.done)
  return idx === -1 ? null : idx
}

export const isPlanComplete = (state: State): boolean =>
  state.plan !== null && getCurrentStep(state) === null

export const hasActiveExploration = (state: State): boolean => state.exploration !== null
