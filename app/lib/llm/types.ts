export type MessageRole = "user" | "assistant" | "system" | "tool"

export type ToolCall = {
  id: string
  type: "function"
  function: {
    name: string
    arguments: string
  }
}

export type Message = {
  role: MessageRole
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

export type CompactionBlock = {
  block_id: string
  summary: string
}

export type StreamEvent =
  | { type: "text_delta"; content: string }
  | { type: "tool_call"; id: string; name: string; arguments: string }
  | { type: "done" }
  | { type: "error"; message: string }

export type ToolHandler = (args: unknown) => Promise<unknown>

export type ToolHandlers = Record<string, ToolHandler>
