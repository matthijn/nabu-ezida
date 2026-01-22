import { describe, it, expect } from "vitest"
import { hasSignificantTextDrift } from "./fingerprint"

describe("hasSignificantTextDrift", () => {
  const cases = [
    {
      name: "no drift for identical text",
      prev: "line1\nline2\nline3",
      curr: "line1\nline2\nline3",
      expected: false,
    },
    {
      name: "no drift for single line change in long doc",
      prev: "line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8\nline9\nline10",
      curr: "line1\nline2\nCHANGED\nline4\nline5\nline6\nline7\nline8\nline9\nline10",
      expected: false,
    },
    {
      name: "drift for many lines changed",
      prev: "line1\nline2\nline3\nline4\nline5",
      curr: "new1\nline2\nline3\nline4\nnew5",
      expected: true,
    },
    {
      name: "drift for completely different content",
      prev: "The quick brown fox\njumps over\nthe lazy dog",
      curr: "function computeHash(input: string)\nreturn 42\nend",
      expected: true,
    },
    {
      name: "drift for major content replacement",
      prev: "a\nb\nc\nd\ne",
      curr: "x\ny\nz\nw\nv",
      expected: true,
    },
    {
      name: "no drift for both empty",
      prev: "",
      curr: "",
      expected: false,
    },
    {
      name: "no drift for adding one line to long doc",
      prev: "line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8\nline9\nline10",
      curr: "line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8\nline9\nline10\nline11",
      expected: false,
    },
    {
      name: "drift for removing many lines",
      prev: "line1\nline2\nline3\nline4\nline5\nline6\nline7\nline8\nline9\nline10",
      curr: "line1\nline2",
      expected: true,
    },
  ]

  it.each(cases)("$name", ({ prev, curr, expected }) => {
    expect(hasSignificantTextDrift(prev, curr)).toBe(expected)
  })
})
