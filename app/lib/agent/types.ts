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
  toolName?: string
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

export type ToolDeps = {
  project?: { id: string }
  navigate?: (url: string) => void
}

export type ToolResult<T> =
  | { status: "ok"; output: T }
  | { status: "partial"; output: T }
  | { status: "error"; output: string }

export type Handler<T = unknown> = (deps: ToolDeps, args: Record<string, unknown>) => Promise<ToolResult<T>>
