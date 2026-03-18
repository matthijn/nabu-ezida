import { describe, it, expect } from "vitest"
import { linkifyTags } from "./tags"

type TagResolver = (label: string) => { id: string; display: string } | null

const testResolver: TagResolver = (label) => {
  const tags: Record<string, { id: string; display: string }> = {
    interview: { id: "tag-abc12345", display: "Interview" },
    "round-1": { id: "tag-def67890", display: "Round 1" },
    codebook: { id: "tag-ghi11111", display: "Codebook" },
  }
  return tags[label] ?? null
}

describe("linkifyTags", () => {
  const cases: { name: string; input: string; expected: string }[] = [
    {
      name: "replaces a single tag",
      input: "This is about #interview data",
      expected: "This is about [Interview](file://tag-abc12345) data",
    },
    {
      name: "replaces multiple tags",
      input: "#interview and #round-1 files",
      expected: "[Interview](file://tag-abc12345) and [Round 1](file://tag-def67890) files",
    },
    {
      name: "leaves unknown tags untouched",
      input: "Check #unknown tag",
      expected: "Check #unknown tag",
    },
    {
      name: "skips tags inside backticks",
      input: "Use `#interview` in code",
      expected: "Use `#interview` in code",
    },
    {
      name: "skips tags inside markdown links",
      input: "See [#interview](http://example.com)",
      expected: "See [#interview](http://example.com)",
    },
    {
      name: "skips hash preceded by word character",
      input: "issue#interview is not a tag",
      expected: "issue#interview is not a tag",
    },
    {
      name: "handles tag at start of line",
      input: "#codebook is important",
      expected: "[Codebook](file://tag-ghi11111) is important",
    },
    {
      name: "handles tag at end of text",
      input: "tagged as #interview",
      expected: "tagged as [Interview](file://tag-abc12345)",
    },
    {
      name: "handles tag after punctuation",
      input: "hello, #interview works",
      expected: "hello, [Interview](file://tag-abc12345) works",
    },
    {
      name: "returns unchanged text with no tags",
      input: "no tags here at all",
      expected: "no tags here at all",
    },
    {
      name: "handles empty string",
      input: "",
      expected: "",
    },
    {
      name: "skips tags inside multi-backtick code",
      input: "text `code #interview here` more",
      expected: "text `code #interview here` more",
    },
  ]

  cases.forEach(({ name, input, expected }) => {
    it(name, () => {
      expect(linkifyTags(input, testResolver)).toBe(expected)
    })
  })
})
