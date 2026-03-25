import { describe, it, expect } from "vitest"
import { extractSearchSlice } from "./slices"

describe("extractSearchSlice", () => {
  const cases: {
    name: string
    hit: { file: string; id?: string; text?: string }
    expected: string | null
  }[] = [
    {
      name: "returns text when present",
      hit: { file: "doc.md", text: "some chunk content" },
      expected: "some chunk content",
    },
    {
      name: "returns null when no text",
      hit: { file: "doc.md" },
      expected: null,
    },
    {
      name: "returns null for id-only hit",
      hit: { file: "doc.md", id: "callout-1" },
      expected: null,
    },
    {
      name: "preserves markup in text",
      hit: { file: "doc.md", text: "passage with <mark>highlighted</mark> content" },
      expected: "passage with <mark>highlighted</mark> content",
    },
  ]

  it.each(cases)("$name", ({ hit, expected }) => {
    expect(extractSearchSlice(hit)).toBe(expected)
  })
})
