import { describe, expect, it } from "vitest"
import {
  createInitialState,
  appendMessage,
  appendInternal,
  appendStreaming,
  clearStreaming,
  setStatus,
  setError,
  finalizeAssistantMessage,
} from "./reducers"
import type { BlockState } from "./types"

describe("createInitialState", () => {
  it("creates empty state with idle status", () => {
    const state = createInitialState()
    expect(state).toEqual({
      messages: [],
      internal: [],
      streaming: "",
      status: "idle",
    })
  })
})

describe("appendMessage", () => {
  const cases = [
    {
      name: "adds first message",
      initial: createInitialState(),
      message: { role: "user" as const, content: "Hello" },
      expectedLength: 1,
    },
    {
      name: "adds to existing messages",
      initial: {
        ...createInitialState(),
        messages: [{ role: "user" as const, content: "Hi" }],
      },
      message: { role: "assistant" as const, content: "Hello" },
      expectedLength: 2,
    },
  ]

  cases.forEach(({ name, initial, message, expectedLength }) => {
    it(name, () => {
      const result = appendMessage(initial, message)
      expect(result.messages).toHaveLength(expectedLength)
      expect(result.messages[result.messages.length - 1]).toEqual(message)
    })
  })

  it("does not mutate original state", () => {
    const original = createInitialState()
    appendMessage(original, { role: "user", content: "Test" })
    expect(original.messages).toHaveLength(0)
  })
})

describe("appendInternal", () => {
  it("adds step result to internal", () => {
    const state = createInitialState()
    const result = appendInternal(state, { step: "search", result: { data: "test" } })
    expect(result.internal).toHaveLength(1)
    expect(result.internal[0]).toEqual({ step: "search", result: { data: "test" } })
  })
})

describe("appendStreaming", () => {
  const cases = [
    {
      name: "appends to empty streaming",
      initial: createInitialState(),
      text: "Hello",
      expected: "Hello",
    },
    {
      name: "appends to existing streaming",
      initial: { ...createInitialState(), streaming: "Hello" },
      text: " World",
      expected: "Hello World",
    },
  ]

  cases.forEach(({ name, initial, text, expected }) => {
    it(name, () => {
      const result = appendStreaming(initial, text)
      expect(result.streaming).toBe(expected)
    })
  })
})

describe("clearStreaming", () => {
  it("clears streaming content", () => {
    const state = { ...createInitialState(), streaming: "Some content" }
    const result = clearStreaming(state)
    expect(result.streaming).toBe("")
  })
})

describe("setStatus", () => {
  const cases: Array<{ name: string; status: BlockState["status"] }> = [
    { name: "sets to streaming", status: "streaming" },
    { name: "sets to done", status: "done" },
    { name: "sets to error", status: "error" },
    { name: "sets to awaiting_tool", status: "awaiting_tool" },
  ]

  cases.forEach(({ name, status }) => {
    it(name, () => {
      const state = createInitialState()
      const result = setStatus(state, status)
      expect(result.status).toBe(status)
    })
  })
})

describe("setError", () => {
  it("sets error status and message", () => {
    const state = createInitialState()
    const result = setError(state, "Something went wrong")
    expect(result.status).toBe("error")
    expect(result.error).toBe("Something went wrong")
  })
})

describe("finalizeAssistantMessage", () => {
  const cases = [
    {
      name: "does nothing when streaming is empty",
      initial: createInitialState(),
      expectedMessages: 0,
      expectedStreaming: "",
    },
    {
      name: "creates assistant message from streaming",
      initial: { ...createInitialState(), streaming: "Hello world" },
      expectedMessages: 1,
      expectedStreaming: "",
    },
  ]

  cases.forEach(({ name, initial, expectedMessages, expectedStreaming }) => {
    it(name, () => {
      const result = finalizeAssistantMessage(initial)
      expect(result.messages).toHaveLength(expectedMessages)
      expect(result.streaming).toBe(expectedStreaming)
    })
  })

  it("creates correct assistant message", () => {
    const state = { ...createInitialState(), streaming: "Hello world" }
    const result = finalizeAssistantMessage(state)
    expect(result.messages[0]).toEqual({ role: "assistant", content: "Hello world" })
  })
})
