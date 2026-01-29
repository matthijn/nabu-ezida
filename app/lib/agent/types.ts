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

export type RawFiles = Map<string, string>

export type Operation =
  | { type: "create_file"; path: string; diff: string }
  | { type: "update_file"; path: string; diff: string }
  | { type: "delete_file"; path: string }
  | { type: "rename_file"; path: string; newPath: string }

export type HandlerResult<T> = ToolResult<T> & { mutations: Operation[] }

export type Handler<T = unknown> = (
  files: RawFiles,
  args: Record<string, unknown>
) => Promise<HandlerResult<T>>
