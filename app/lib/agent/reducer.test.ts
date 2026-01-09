import { describe, expect, it } from "vitest"
import { appendBlock } from "./reducer"
import type { Block } from "./types"

describe("appendBlock", () => {
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
      const result = appendBlock([], block)
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(block)
    })
  })

  it("preserves existing history", () => {
    const existing: Block = { type: "text", content: "First" }
    const history = [existing]
    const block: Block = { type: "text", content: "Second" }

    const result = appendBlock(history, block)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual(existing)
    expect(result[1]).toEqual(block)
  })
})
