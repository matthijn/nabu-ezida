export interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
}

export interface TextBlock {
  type: "text"
  content: string
  draft?: true
}

export interface ToolCallBlock {
  type: "tool_call"
  calls: ToolCall[]
  draft?: true
}

export interface ToolResultBlock {
  type: "tool_result"
  callId: string
  toolName?: string
  result: unknown
}

export interface UserBlock {
  type: "user"
  content: string
}

export interface SystemBlock {
  type: "system"
  content: string
}

export interface ReasoningBlock {
  type: "reasoning"
  content: string
  id?: string
  encryptedContent?: string
  draft?: true
}

export interface EmptyNudgeBlock {
  type: "empty_nudge"
}

export interface ErrorBlock {
  type: "error"
  content: string
}

export interface DebugPauseBlock {
  type: "debug_pause"
}

export type Block = (
  | TextBlock
  | ToolCallBlock
  | ToolResultBlock
  | UserBlock
  | SystemBlock
  | ReasoningBlock
  | EmptyNudgeBlock
  | ErrorBlock
  | DebugPauseBlock
) & { timestamp?: number; source?: string }

export interface ToolDeps {
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
  | { type: "write_file"; path: string; content: string }
  | { type: "delete_file"; path: string }
  | { type: "rename_file"; path: string; newPath: string }

export type HandlerResult<T> = ToolResult<T> & { mutations: Operation[]; hint?: string }

export type Handler<T = unknown> = (
  files: RawFiles,
  args: Record<string, unknown>
) => Promise<HandlerResult<T>>
