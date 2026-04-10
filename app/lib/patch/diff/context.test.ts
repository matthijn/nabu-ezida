import { describe, it, expect } from "vitest"
import { expandMatch, countLines } from "./context"
import { type Match, getMatchedText } from "./search"

describe("expandMatch", () => {
  const cases: { name: string; match: Match; n: number; totalLines: number; expected: Match }[] = [
    {
      name: "expands both directions",
      match: { start: 5, end: 7, fuzzy: false },
      n: 2,
      totalLines: 20,
      expected: { start: 3, end: 9, fuzzy: false },
    },
    {
      name: "clamps at start of file",
      match: { start: 1, end: 2, fuzzy: false },
      n: 3,
      totalLines: 20,
      expected: { start: 0, end: 5, fuzzy: false },
    },
    {
      name: "clamps at end of file",
      match: { start: 17, end: 18, fuzzy: false },
      n: 3,
      totalLines: 20,
      expected: { start: 14, end: 19, fuzzy: false },
    },
    {
      name: "clamps both ends on small file",
      match: { start: 2, end: 3, fuzzy: true },
      n: 5,
      totalLines: 6,
      expected: { start: 0, end: 5, fuzzy: true },
    },
    {
      name: "zero expansion returns same bounds",
      match: { start: 5, end: 7, fuzzy: false },
      n: 0,
      totalLines: 20,
      expected: { start: 5, end: 7, fuzzy: false },
    },
  ]

  it.each(cases)("$name", ({ match, n, totalLines, expected }) => {
    expect(expandMatch(match, n, totalLines)).toEqual(expected)
  })
})

describe("expandMatch + getMatchedText", () => {
  const content = "line0\nline1\nline2\nline3\nline4\nline5\nline6\nline7\nline8\nline9"

  const cases: { name: string; match: Match; n: number; expected: string }[] = [
    {
      name: "returns lines in expanded range",
      match: { start: 3, end: 4, fuzzy: false },
      n: 1,
      expected: "line2\nline3\nline4\nline5",
    },
  ]

  it.each(cases)("$name", ({ match, n, expected }) => {
    const expanded = expandMatch(match, n, countLines(content))
    expect(getMatchedText(content, expanded)).toBe(expected)
  })
})

describe("countLines", () => {
  const cases: { name: string; input: string; expected: number }[] = [
    { name: "counts multi-line", input: "a\nb\nc", expected: 3 },
    { name: "counts single line", input: "single", expected: 1 },
    { name: "counts empty string as one line", input: "", expected: 1 },
  ]

  it.each(cases)("$name", ({ input, expected }) => {
    expect(countLines(input)).toBe(expected)
  })
})
