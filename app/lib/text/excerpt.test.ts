import { describe, it, expect } from "vitest"
import { buildExcerpt } from "./excerpt"
import { CHARS_PER_TOKEN } from "~/lib/embeddings/constants"

const tokensToChars = (tokens: number): number => tokens * CHARS_PER_TOKEN

const makeParagraph = (id: number, tokens: number): string =>
  `p${id}-${"x".repeat(tokensToChars(tokens) - `p${id}-`.length)}`

const makeLongDocument = (paragraphCount: number, tokensPerParagraph: number): string =>
  Array.from({ length: paragraphCount }, (_, i) => makeParagraph(i, tokensPerParagraph)).join(
    "\n\n"
  )

describe("buildExcerpt", () => {
  const cases: {
    name: string
    input: string
    tokensPerSection: number
    check: (result: string) => void
  }[] = [
    {
      name: "empty text returns empty",
      input: "",
      tokensPerSection: 250,
      check: (r) => expect(r).toBe(""),
    },
    {
      name: "whitespace only returns empty",
      input: "   \n\n   ",
      tokensPerSection: 250,
      check: (r) => expect(r).toBe(""),
    },
    {
      name: "short text returned as-is",
      input: "Hello world.\n\nSecond paragraph.",
      tokensPerSection: 250,
      check: (r) => expect(r).toBe("Hello world.\n\nSecond paragraph."),
    },
    {
      name: "text within 3x budget returned as-is",
      input: makeLongDocument(3, 200),
      tokensPerSection: 250,
      check: (r) => expect(r).not.toContain("..."),
    },
    {
      name: "long text gets three sections with separators",
      input: makeLongDocument(30, 100),
      tokensPerSection: 250,
      check: (r) => {
        const sections = r.split("\n...\n")
        expect(sections).toHaveLength(3)
      },
    },
    {
      name: "start section contains first paragraphs",
      input: makeLongDocument(30, 100),
      tokensPerSection: 250,
      check: (r) => {
        const start = r.split("\n...\n")[0]
        expect(start).toContain("p0-")
      },
    },
    {
      name: "end section contains last paragraphs",
      input: makeLongDocument(30, 100),
      tokensPerSection: 250,
      check: (r) => {
        const end = r.split("\n...\n")[2]
        expect(end).toContain("p29-")
      },
    },
    {
      name: "middle section contains central paragraphs",
      input: makeLongDocument(30, 100),
      tokensPerSection: 250,
      check: (r) => {
        const middle = r.split("\n...\n")[1]
        expect(middle).toContain("p15-")
      },
    },
  ]

  it.each(cases)("$name", ({ input, tokensPerSection, check }) => {
    check(buildExcerpt(input, tokensPerSection))
  })
})
