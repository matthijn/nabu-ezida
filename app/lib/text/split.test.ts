import { describe, it, expect } from "vitest"
import { splitBySentences, splitByLines, splitByParagraphs } from "./split"

describe("splitBySentences", () => {
  const split = splitBySentences()

  const cases: { name: string; input: string; expected: string[] }[] = [
    {
      name: "simple prose",
      input: "Hello world. How are you? I am fine!",
      expected: ["Hello world.", "How are you?", "I am fine!"],
    },
    {
      name: "single sentence",
      input: "Just one sentence here.",
      expected: ["Just one sentence here."],
    },
    {
      name: "empty input",
      input: "",
      expected: [],
    },
    {
      name: "whitespace only",
      input: "   \n  ",
      expected: [],
    },
    {
      name: "multi-paragraph",
      input: "First paragraph. Second sentence.\n\nThird sentence.",
      expected: ["First paragraph.", "Second sentence.", "Third sentence."],
    },
  ]

  it.each(cases)("$name", ({ input, expected }) => {
    const segments = split(input)
    expect(segments.map((s) => s.text)).toEqual(expected)
  })

  it("offset correctness: text.slice(s.start, s.end) === s.text", () => {
    const input = "Hello world. How are you? I am fine!"
    const segments = split(input)
    for (const s of segments) {
      expect(input.slice(s.start, s.end)).toBe(s.text)
    }
  })

  it("offsets are correct for multi-paragraph input", () => {
    const input = "First. Second.\n\nThird."
    const segments = split(input)
    for (const s of segments) {
      expect(input.slice(s.start, s.end)).toBe(s.text)
    }
  })
})

describe("splitByLines", () => {
  const cases: { name: string; input: string; expected: string[] }[] = [
    {
      name: "multiple lines",
      input: "line one\nline two\nline three",
      expected: ["line one", "line two", "line three"],
    },
    {
      name: "single line",
      input: "just one",
      expected: ["just one"],
    },
    {
      name: "empty lines preserved",
      input: "a\n\nb",
      expected: ["a", "", "b"],
    },
  ]

  it.each(cases)("$name", ({ input, expected }) => {
    expect(splitByLines(input).map((s) => s.text)).toEqual(expected)
  })

  it("offset correctness", () => {
    const input = "line one\nline two\nline three"
    for (const s of splitByLines(input)) {
      expect(input.slice(s.start, s.end)).toBe(s.text)
    }
  })
})

describe("splitByParagraphs", () => {
  const cases: { name: string; input: string; expected: string[] }[] = [
    {
      name: "two paragraphs",
      input: "paragraph one\n\nparagraph two",
      expected: ["paragraph one", "paragraph two"],
    },
    {
      name: "triple newline",
      input: "a\n\n\nb",
      expected: ["a", "b"],
    },
    {
      name: "filters empty segments",
      input: "\n\ncontent\n\n",
      expected: ["content"],
    },
  ]

  it.each(cases)("$name", ({ input, expected }) => {
    expect(splitByParagraphs(input).map((s) => s.text)).toEqual(expected)
  })

  it("offset correctness", () => {
    const input = "paragraph one\n\nparagraph two"
    for (const s of splitByParagraphs(input)) {
      expect(input.slice(s.start, s.end)).toBe(s.text)
    }
  })
})
