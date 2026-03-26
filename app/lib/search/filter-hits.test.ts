import { describe, it, expect } from "vitest"
import { extractMarkedSections } from "./filter-hits"

describe("extractMarkedSections", () => {
  const cases: {
    name: string
    text: string
    file: string
    expected: { file: string; text: string }[]
  }[] = [
    {
      name: "single mark span → one hit",
      text: "Irrelevant preamble. <mark>This is the matching part.</mark> Trailing filler.",
      file: "doc.md",
      expected: [{ file: "doc.md", text: "This is the matching part." }],
    },
    {
      name: "multiple mark spans → multiple hits",
      text: "Filler. <mark>First match.</mark> Middle noise. <mark>Second match.</mark> End.",
      file: "notes.md",
      expected: [
        { file: "notes.md", text: "First match." },
        { file: "notes.md", text: "Second match." },
      ],
    },
    {
      name: "no marks → empty array",
      text: "This passage has no marked sections at all.",
      file: "empty.md",
      expected: [],
    },
    {
      name: "adjacent marks collapse into single span",
      text: "Before. <mark>Part one</mark> <mark>part two</mark> After.",
      file: "merged.md",
      expected: [{ file: "merged.md", text: "Part one part two" }],
    },
    {
      name: "adjacent marks with no space collapse",
      text: "<mark>A</mark><mark>B</mark>",
      file: "tight.md",
      expected: [{ file: "tight.md", text: "AB" }],
    },
    {
      name: "preserves file from parent",
      text: "<mark>Content here.</mark>",
      file: "src/components/Button.tsx",
      expected: [{ file: "src/components/Button.tsx", text: "Content here." }],
    },
    {
      name: "empty mark span is excluded",
      text: "<mark>   </mark>",
      file: "blank.md",
      expected: [],
    },
    {
      name: "multiline content inside mark",
      text: "<mark>Line one.\nLine two.</mark>",
      file: "multi.md",
      expected: [{ file: "multi.md", text: "Line one.\nLine two." }],
    },
  ]

  it.each(cases)("$name", ({ text, file, expected }) => {
    expect(extractMarkedSections(text, file)).toEqual(expected)
  })
})
