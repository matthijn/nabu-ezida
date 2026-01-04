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

export type State = {
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
  history: [],
}
