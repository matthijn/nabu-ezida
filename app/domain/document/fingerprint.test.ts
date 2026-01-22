import { describe, it, expect } from "vitest"
import { computeBlockFingerprint, hasSignificantBlockDrift } from "./fingerprint"
import type { Block } from "./block"

const makeBlock = (type: string, text: string): Block => ({
  id: "1",
  type: type as Block["type"],
  content: [{ type: "text", text }],
  props: {},
  children: [],
})

describe("computeBlockFingerprint", () => {
  const cases = [
    { name: "empty", blocks: [], expected: { blockCount: 0, textLength: 0, headingCount: 0 } },
    {
      name: "single paragraph",
      blocks: [makeBlock("paragraph", "hello")],
      expected: { blockCount: 1, textLength: 5, headingCount: 0 },
    },
    {
      name: "heading",
      blocks: [makeBlock("heading", "title")],
      expected: { blockCount: 1, textLength: 5, headingCount: 1 },
    },
    {
      name: "multiple blocks",
      blocks: [makeBlock("heading", "title"), makeBlock("paragraph", "content")],
      expected: { blockCount: 2, textLength: 12, headingCount: 1 },
    },
  ]

  it.each(cases)("$name", ({ blocks, expected }) => {
    expect(computeBlockFingerprint(blocks)).toEqual(expected)
  })
})

describe("hasSignificantBlockDrift", () => {
  const cases = [
    {
      name: "no drift for identical",
      prev: { blockCount: 10, textLength: 100, headingCount: 2 },
      curr: { blockCount: 10, textLength: 100, headingCount: 2 },
      expected: false,
    },
    {
      name: "drift from empty",
      prev: { blockCount: 0, textLength: 0, headingCount: 0 },
      curr: { blockCount: 1, textLength: 10, headingCount: 0 },
      expected: true,
    },
    {
      name: "no drift for small change",
      prev: { blockCount: 10, textLength: 100, headingCount: 2 },
      curr: { blockCount: 11, textLength: 110, headingCount: 2 },
      expected: false,
    },
    {
      name: "drift for large block count change",
      prev: { blockCount: 10, textLength: 100, headingCount: 2 },
      curr: { blockCount: 15, textLength: 100, headingCount: 2 },
      expected: true,
    },
    {
      name: "drift for large text length change",
      prev: { blockCount: 10, textLength: 100, headingCount: 2 },
      curr: { blockCount: 10, textLength: 150, headingCount: 2 },
      expected: true,
    },
  ]

  it.each(cases)("$name", ({ prev, curr, expected }) => {
    expect(hasSignificantBlockDrift(prev, curr)).toBe(expected)
  })
})
