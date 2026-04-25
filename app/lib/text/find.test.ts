import { describe, it, expect } from "vitest"
import { findMatchOffset } from "./find"

describe("findMatchOffset", () => {
  const cases: {
    name: string
    content: string
    needle: string
    expected: { start: number; end: number } | null
  }[] = [
    {
      name: "exact substring match",
      content: "the quick brown fox jumps over the lazy dog",
      needle: "brown fox jumps",
      expected: { start: 10, end: 25 },
    },
    {
      name: "case-insensitive exact match",
      content: "The Quick Brown Fox",
      needle: "quick brown",
      expected: { start: 4, end: 15 },
    },
    {
      name: "no match returns null",
      content: "hello world",
      needle: "something completely different and long enough",
      expected: null,
    },
    {
      name: "newlines flattened for exact match",
      content: "hello\nworld\nfoo",
      needle: "hello world",
      expected: { start: 0, end: 11 },
    },
    {
      name: "fuzzy match with reordered tokens",
      content: "alpha bravo charlie delta echo foxtrot golf hotel india",
      needle: "bravo charlie delta echo foxtrot golf",
      expected: { start: 6, end: 43 },
    },
    {
      name: "short needle with no exact substring returns null",
      content: "the quick brown fox",
      needle: "zebra",
      expected: null,
    },
    {
      name: "single char exact substring still matches",
      content: "the quick brown fox",
      needle: "x",
      expected: { start: 18, end: 19 },
    },
  ]

  it.each(cases)("$name", ({ content, needle, expected }) => {
    const result = findMatchOffset(content, needle)
    if (expected === null) {
      expect(result).toBeNull()
    } else {
      expect(result).toEqual(expected)
    }
  })
})
