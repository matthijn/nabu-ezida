export type ToolCall = {
  id: string
  name: string
  args: Record<string, unknown>
}

export type TextBlock = {
  type: "text"
  content: string
  draft?: true
}

export type ToolCallBlock = {
  type: "tool_call"
  calls: ToolCall[]
  draft?: true
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

export type ReasoningBlock = {
  type: "reasoning"
  content: string
  id?: string
  encryptedContent?: string
  draft?: true
}

export type EmptyNudgeBlock = {
  type: "empty_nudge"
}

export type ErrorBlock = {
  type: "error"
  content: string
}

export type Block = (TextBlock | ToolCallBlock | ToolResultBlock | UserBlock | SystemBlock | ReasoningBlock | EmptyNudgeBlock | ErrorBlock) & { timestamp?: number }

export type ToolDeps = {
  project?: { id: string }
  navigate?: (url: string) => void
}

export type ToolResult<T> =
  | { status: "ok"; output: T; message?: string; hint?: string }
  | { status: "partial"; output: T; message?: string; hint?: string }
  | { status: "error"; output: string; message?: string; hint?: string }

export type RawFiles = Map<string, string>

export type Operation =
  | { type: "create_file"; path: string; diff: string }
  | { type: "update_file"; path: string; diff: string; skipImmutableCheck?: boolean }
  | { type: "delete_file"; path: string }
  | { type: "rename_file"; path: string; newPath: string }

export type HandlerResult<T> = ToolResult<T> & { mutations: Operation[]; hint?: string }

export type Handler<T = unknown> = (
  files: RawFiles,
  args: Record<string, unknown>
) => Promise<HandlerResult<T>>
