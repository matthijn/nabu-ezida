import { describe, expect, it } from "vitest"
import { diffBlocks, type BlockOp } from "./diff"
import type { Block } from "./block"

const block = (id: string, content = "text"): Block => ({
  id,
  type: "paragraph",
  content: [{ type: "text", text: content }],
})

describe("diffBlocks", () => {
  const cases: { name: string; old: Block[]; new: Block[]; expected: BlockOp[] }[] = [
    {
      name: "no changes returns empty ops",
      old: [block("1"), block("2")],
      new: [block("1"), block("2")],
      expected: [],
    },
    {
      name: "detects removed block",
      old: [block("1"), block("2"), block("3")],
      new: [block("1"), block("3")],
      expected: [{ type: "remove", id: "2" }],
    },
    {
      name: "detects added block at start",
      old: [block("2")],
      new: [block("1"), block("2")],
      expected: [{ type: "add", block: block("1"), afterId: null }],
    },
    {
      name: "detects added block in middle",
      old: [block("1"), block("3")],
      new: [block("1"), block("2"), block("3")],
      expected: [{ type: "add", block: block("2"), afterId: "1" }],
    },
    {
      name: "detects added block at end",
      old: [block("1")],
      new: [block("1"), block("2")],
      expected: [{ type: "add", block: block("2"), afterId: "1" }],
    },
    {
      name: "detects replaced block",
      old: [block("1", "old")],
      new: [block("1", "new")],
      expected: [{ type: "replace", block: block("1", "new") }],
    },
    {
      name: "handles multiple operations",
      old: [block("1"), block("2", "old"), block("3")],
      new: [block("1"), block("2", "new"), block("4")],
      expected: [
        { type: "remove", id: "3" },
        { type: "replace", block: block("2", "new") },
        { type: "add", block: block("4"), afterId: "2" },
      ],
    },
    {
      name: "empty to blocks",
      old: [],
      new: [block("1"), block("2")],
      expected: [
        { type: "add", block: block("1"), afterId: null },
        { type: "add", block: block("2"), afterId: "1" },
      ],
    },
    {
      name: "blocks to empty",
      old: [block("1"), block("2")],
      new: [],
      expected: [
        { type: "remove", id: "1" },
        { type: "remove", id: "2" },
      ],
    },
  ]

  cases.forEach(({ name, old, new: newBlocks, expected }) => {
    it(name, () => {
      const result = diffBlocks(old, newBlocks)
      expect(result).toEqual(expected)
    })
  })
})
