import type { BlockState, BlockStatus, Message, StepResult } from "./types"

export const createInitialState = (): BlockState => ({
  messages: [],
  internal: [],
  streaming: "",
  status: "idle",
})

export const appendMessage = (state: BlockState, message: Message): BlockState => ({
  ...state,
  messages: [...state.messages, message],
})

export const appendInternal = (state: BlockState, result: StepResult): BlockState => ({
  ...state,
  internal: [...state.internal, result],
})

export const appendStreaming = (state: BlockState, text: string): BlockState => ({
  ...state,
  streaming: state.streaming + text,
})

export const clearStreaming = (state: BlockState): BlockState => ({
  ...state,
  streaming: "",
})

export const setStatus = (state: BlockState, status: BlockStatus): BlockState => ({
  ...state,
  status,
})

export const setError = (state: BlockState, error: string): BlockState => ({
  ...state,
  status: "error",
  error,
})

export const finalizeAssistantMessage = (state: BlockState): BlockState => {
  if (!state.streaming) return state
  return {
    ...state,
    messages: [...state.messages, { role: "assistant", content: state.streaming }],
    streaming: "",
  }
}
