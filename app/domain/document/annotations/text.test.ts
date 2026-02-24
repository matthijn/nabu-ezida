import { describe, it, expect } from "vitest"
import { findAllTextPositions, findTextPosition, resolveTextAnnotations } from "./text"
import type { Annotation } from "./types"

describe("findAllTextPositions", () => {
  const cases = [
    {
      name: "finds single occurrence",
      fullText: "hello world",
      search: "world",
      expected: [{ from: 6, to: 11 }],
    },
    {
      name: "finds multiple occurrences",
      fullText: "abcabc",
      search: "abc",
      expected: [{ from: 0, to: 3 }, { from: 3, to: 6 }],
    },
    {
      name: "returns empty when not found",
      fullText: "hello",
      search: "xyz",
      expected: [],
    },
    {
      name: "finds overlapping occurrences",
      fullText: "aaa",
      search: "aa",
      expected: [{ from: 0, to: 2 }, { from: 1, to: 3 }],
    },
    {
      name: "returns empty for empty search text",
      fullText: "hello",
      search: "",
      expected: [],
    },
    {
      name: "finds repeated text in document with duplication",
      fullText: "KOOLMEES said hello. Later, KOOLMEES said goodbye.",
      search: "KOOLMEES",
      expected: [{ from: 0, to: 8 }, { from: 28, to: 36 }],
    },
  ]

  it.each(cases)("$name", ({ fullText, search, expected }) => {
    expect(findAllTextPositions(fullText, search)).toEqual(expected)
  })
})

describe("findTextPosition", () => {
  const cases = [
    {
      name: "returns first match",
      fullText: "abcabc",
      search: "abc",
      expected: { from: 0, to: 3 },
    },
    {
      name: "returns null when not found",
      fullText: "hello",
      search: "xyz",
      expected: null,
    },
  ]

  it.each(cases)("$name", ({ fullText, search, expected }) => {
    expect(findTextPosition(fullText, search)).toEqual(expected)
  })
})

describe("resolveTextAnnotations", () => {
  const makeAnnotation = (text: string, color = "amber"): Annotation => ({ text, color })

  const cases = [
    {
      name: "resolves single annotation to single position",
      fullText: "hello world",
      annotations: [makeAnnotation("world")],
      expected: [{ index: 0, from: 6, to: 11, color: "amber" }],
    },
    {
      name: "resolves annotation appearing twice to two positions",
      fullText: "abc def abc",
      annotations: [makeAnnotation("abc")],
      expected: [
        { index: 0, from: 0, to: 3, color: "amber" },
        { index: 1, from: 8, to: 11, color: "amber" },
      ],
    },
    {
      name: "assigns unique indices across multiple annotations",
      fullText: "aa bb aa bb",
      annotations: [makeAnnotation("aa"), makeAnnotation("bb")],
      expected: [
        { index: 0, from: 0, to: 2, color: "amber" },
        { index: 1, from: 6, to: 8, color: "amber" },
        { index: 2, from: 3, to: 5, color: "amber" },
        { index: 3, from: 9, to: 11, color: "amber" },
      ],
    },
    {
      name: "skips annotations not found in text",
      fullText: "hello",
      annotations: [makeAnnotation("hello"), makeAnnotation("missing")],
      expected: [{ index: 0, from: 0, to: 5, color: "amber" }],
    },
    {
      name: "returns empty for no annotations",
      fullText: "hello",
      annotations: [],
      expected: [],
    },
  ]

  it.each(cases)("$name", ({ fullText, annotations, expected }) => {
    expect(resolveTextAnnotations(fullText, annotations)).toEqual(expected)
  })
})
