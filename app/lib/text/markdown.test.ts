import { describe, it, expect } from "vitest"
import { mdToPlainText } from "./markdown"

describe("mdToPlainText", () => {
  const cases: { name: string; input: string; expected: string }[] = [
    {
      name: "strips bold markers",
      input: "The **quick** brown fox",
      expected: "The quick brown fox",
    },
    {
      name: "strips italic markers",
      input: "The _quick_ brown fox",
      expected: "The quick brown fox",
    },
    {
      name: "strips heading markers",
      input: "# Hello World",
      expected: "Hello World",
    },
    {
      name: "strips inline code",
      input: "Use `console.log` here",
      expected: "Use console.log here",
    },
    {
      name: "strips links but keeps text",
      input: "Click [here](https://example.com) now",
      expected: "Click here now",
    },
    {
      name: "handles multiple paragraphs",
      input: "First paragraph.\n\nSecond paragraph.",
      expected: "First paragraph.Second paragraph.",
    },
    {
      name: "handles complex markdown",
      input: "# Title\n\nSome **bold** and _italic_ text with `code`.",
      expected: "TitleSome bold and italic text with code.",
    },
  ]

  it.each(cases)("$name", ({ input, expected }) => {
    expect(mdToPlainText(input)).toBe(expected)
  })
})
