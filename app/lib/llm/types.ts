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

export type StepResult = {
  step: string
  result: unknown
}

export type CompactionBlock = {
  block_id: string
  summary: string
}

export type BlockStatus = "idle" | "streaming" | "awaiting_tool" | "done" | "error"

export type BlockState = {
  messages: Message[]
  internal: StepResult[]
  streaming: string
  status: BlockStatus
  error?: string
}

export type StreamEvent =
  | { type: "text_delta"; content: string }
  | { type: "tool_call"; id: string; name: string; arguments: string }
  | { type: "done" }
  | { type: "error"; message: string }

export type Effect =
  | { type: "execute_tool"; id: string; name: string; args: unknown }
  | { type: "push_shared"; summary: string }

export type ToolHandler = (args: unknown) => Promise<unknown>

export type ToolHandlers = Record<string, ToolHandler>
