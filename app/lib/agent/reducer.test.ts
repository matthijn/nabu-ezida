import { describe, expect, it } from "vitest"
import { reducer } from "./reducer"
import type { Block } from "./types"
import { initialState } from "./types"

describe("reducer", () => {
  const cases = [
    {
      name: "appends text block to history",
      block: { type: "text" as const, content: "Hello" },
    },
    {
      name: "appends tool_call block to history",
      block: {
        type: "tool_call" as const,
        calls: [{ id: "1", name: "test", args: {} }],
      },
    },
    {
      name: "appends tool_result block to history",
      block: { type: "tool_result" as const, callId: "1", result: { data: "test" } },
    },
    {
      name: "appends user block to history",
      block: { type: "user" as const, content: "User message" },
    },
    {
      name: "appends system block to history",
      block: { type: "system" as const, content: "System message" },
    },
  ]

  cases.forEach(({ name, block }) => {
    it(name, () => {
      const result = reducer(initialState, block)
      expect(result.history).toHaveLength(1)
      expect(result.history[0]).toEqual(block)
    })
  })

  it("preserves existing history", () => {
    const existing: Block = { type: "text", content: "First" }
    const state = { history: [existing] }
    const block: Block = { type: "text", content: "Second" }

    const result = reducer(state, block)

    expect(result.history).toHaveLength(2)
    expect(result.history[0]).toEqual(existing)
    expect(result.history[1]).toEqual(block)
  })
})
