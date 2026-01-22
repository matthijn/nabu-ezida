import type { StreamEvent } from "./types"

type ToolCallAccumulator = {
  id: string
  name: string
  arguments: string
}

type ParseState = {
  currentEvent: string
  toolCallAcc: ToolCallAccumulator | null
}

export const initialParseState = (): ParseState => ({
  currentEvent: "",
  toolCallAcc: null,
})

export const parseSSELine = (
  line: string,
  state: ParseState
): { event: StreamEvent | null; state: ParseState } => {
  if (line.startsWith("event: ")) {
    return { event: null, state: { ...state, currentEvent: line.slice(7) } }
  }

  if (!line.startsWith("data: ")) {
    return { event: null, state }
  }

  const data = line.slice(6)

  try {
    const parsed = JSON.parse(data)

    if (state.currentEvent === "response.output_text.delta") {
      if (parsed.delta) {
        return { event: { type: "text_delta", content: parsed.delta }, state }
      }
    }

    if (state.currentEvent === "response.function_call_arguments.delta") {
      const newAcc: ToolCallAccumulator = state.toolCallAcc
        ? { ...state.toolCallAcc, arguments: state.toolCallAcc.arguments + (parsed.delta ?? "") }
        : { id: parsed.call_id ?? "", name: parsed.name ?? "", arguments: parsed.delta ?? "" }
      return { event: null, state: { ...state, toolCallAcc: newAcc } }
    }

    if (state.currentEvent === "response.function_call_arguments.done") {
      return {
        event: { type: "tool_call", id: parsed.call_id, name: parsed.name, arguments: parsed.arguments },
        state: { ...state, toolCallAcc: null },
      }
    }

    if (state.currentEvent === "response.completed") {
      return { event: { type: "done" }, state: { ...state, currentEvent: "" } }
    }

    return { event: null, state }
  } catch {
    return { event: { type: "error", message: "Failed to parse SSE chunk" }, state }
  }
}
