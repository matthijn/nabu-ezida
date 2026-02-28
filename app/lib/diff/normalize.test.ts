import { describe, it, expect } from "vitest"
import { isBlankLine, normalizeLine, normalizeContent } from "./normalize"

describe("isBlankLine", () => {
  const cases = [
    { name: "empty string", input: "", expected: true },
    { name: "spaces only", input: "   ", expected: true },
    { name: "tabs only", input: "\t\t", expected: true },
    { name: "mixed spaces and tabs", input: "  \t \t  ", expected: true },
    { name: "text content", input: "hello", expected: false },
    { name: "text with leading space", input: " hello", expected: false },
    { name: "text with trailing space", input: "hello ", expected: false },
  ]

  it.each(cases)("$name", ({ input, expected }) => {
    expect(isBlankLine(input)).toBe(expected)
  })
})

describe("normalizeLine", () => {
  const cases = [
    { name: "no change needed", input: "hello", expected: "hello" },
    { name: "trims trailing spaces", input: "hello   ", expected: "hello" },
    { name: "trims trailing tabs", input: "hello\t\t", expected: "hello" },
    { name: "trims trailing mixed", input: "hello \t ", expected: "hello" },
    { name: "converts 2-space indent to tab", input: "  hello", expected: "\thello" },
    { name: "converts 4-space indent to 2 tabs", input: "    hello", expected: "\t\thello" },
    { name: "converts 6-space indent to 3 tabs", input: "      hello", expected: "\t\t\thello" },
    { name: "drops odd trailing space in indent", input: "   hello", expected: "\thello" },
    { name: "preserves existing tabs", input: "\thello", expected: "\thello" },
    { name: "converts spaces and trims trailing", input: "    hello  ", expected: "\t\thello" },
    { name: "blank line becomes empty", input: "   ", expected: "" },
    { name: "tab-only line becomes empty", input: "\t\t", expected: "" },
    { name: "empty stays empty", input: "", expected: "" },
  ]

  it.each(cases)("$name", ({ input, expected }) => {
    expect(normalizeLine(input)).toBe(expected)
  })
})

describe("normalizeContent", () => {
  const cases = [
    {
      name: "collapses consecutive blank lines",
      input: "line1\n\n\n\nline2",
      expected: "line1\n\nline2",
    },
    {
      name: "collapses whitespace-only blank lines",
      input: "line1\n   \n\t\n\nline2",
      expected: "line1\n\nline2",
    },
    {
      name: "trims trailing whitespace per line",
      input: "hello   \nworld\t\t",
      expected: "hello\nworld",
    },
    {
      name: "converts space indentation to tabs",
      input: "- item\n  - child\n    - grandchild",
      expected: "- item\n\t- child\n\t\t- grandchild",
    },
    {
      name: "trims trailing blank lines",
      input: "hello\nworld\n\n\n",
      expected: "hello\nworld",
    },
    {
      name: "preserves single blank line between content",
      input: "# Title\n\nParagraph",
      expected: "# Title\n\nParagraph",
    },
    {
      name: "full normalization pipeline",
      input: "# Title  \n\n\n  - item  \n   \n\t\n  - item2\n\n",
      expected: "# Title\n\n\t- item\n\n\t- item2",
    },
    {
      name: "empty string stays empty",
      input: "",
      expected: "",
    },
    {
      name: "single line",
      input: "hello",
      expected: "hello",
    },
    {
      name: "only blank lines becomes empty",
      input: "\n\n\n",
      expected: "",
    },
  ]

  it.each(cases)("$name", ({ input, expected }) => {
    expect(normalizeContent(input)).toBe(expected)
  })
})
