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

export type ToolDeps = {
  query?: <T = unknown>(sql: string) => Promise<{ rows: T[]; rowCount: number }>
  project?: import("~/domain/project").Project
  navigate?: (url: string) => void
}

export type Handler = (deps: ToolDeps, args: Record<string, unknown>) => Promise<unknown>
