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

export type Block = TextBlock | ToolCallBlock | ToolResultBlock

export type Step = {
  id: string
  description: string
  done: boolean
}

export type Plan = {
  task: string
  steps: Step[]
}

export type Mode = "chat" | "exec"

export type State = {
  mode: Mode
  plan: Plan | null
  currentStep: number | null
  pendingToolCalls: ToolCall[] | null
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
  mode: "chat",
  plan: null,
  currentStep: null,
  pendingToolCalls: null,
  history: [],
}
