import type { StreamEvent } from "./types"

type OpenAIDelta = {
  content?: string | null
  tool_calls?: Array<{
    index: number
    id?: string
    type?: string
    function?: {
      name?: string
      arguments?: string
    }
  }>
}

type OpenAIChoice = {
  delta: OpenAIDelta
  finish_reason: string | null
}

type OpenAIChunk = {
  choices?: OpenAIChoice[]
}

type ToolCallAccumulator = {
  id: string
  name: string
  arguments: string
}

export const parseSSELine = (
  line: string,
  toolCallAcc: ToolCallAccumulator | null
): { event: StreamEvent | null; toolCallAcc: ToolCallAccumulator | null } => {
  if (!line.startsWith("data: ")) {
    return { event: null, toolCallAcc }
  }

  const data = line.slice(6)
  if (data === "[DONE]") {
    if (toolCallAcc) {
      return {
        event: { type: "tool_call", id: toolCallAcc.id, name: toolCallAcc.name, arguments: toolCallAcc.arguments },
        toolCallAcc: null,
      }
    }
    return { event: { type: "done" }, toolCallAcc: null }
  }

  try {
    const chunk: OpenAIChunk = JSON.parse(data)
    const choice = chunk.choices?.[0]
    if (!choice) return { event: null, toolCallAcc }

    const delta = choice.delta

    if (delta.content) {
      return { event: { type: "text_delta", content: delta.content }, toolCallAcc }
    }

    if (delta.tool_calls) {
      const tc = delta.tool_calls[0]
      if (tc.id) {
        if (toolCallAcc) {
          return {
            event: { type: "tool_call", id: toolCallAcc.id, name: toolCallAcc.name, arguments: toolCallAcc.arguments },
            toolCallAcc: { id: tc.id, name: tc.function?.name ?? "", arguments: tc.function?.arguments ?? "" },
          }
        }
        return {
          event: null,
          toolCallAcc: { id: tc.id, name: tc.function?.name ?? "", arguments: tc.function?.arguments ?? "" },
        }
      }
      if (toolCallAcc && tc.function?.arguments) {
        return {
          event: null,
          toolCallAcc: { ...toolCallAcc, arguments: toolCallAcc.arguments + tc.function.arguments },
        }
      }
    }

    if (choice.finish_reason === "tool_calls" && toolCallAcc) {
      return {
        event: { type: "tool_call", id: toolCallAcc.id, name: toolCallAcc.name, arguments: toolCallAcc.arguments },
        toolCallAcc: null,
      }
    }

    return { event: null, toolCallAcc }
  } catch {
    return { event: { type: "error", message: "Failed to parse SSE chunk" }, toolCallAcc }
  }
}
