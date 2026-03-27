import { describe, it, expect } from "vitest"
import { extractSearchSlice } from "./slices"

const makeAttrs = (
  annotations: { text: string; reason: string; color: string }[],
  tags?: string[]
) => {
  const obj: Record<string, unknown> = {}
  if (tags) obj.tags = tags
  obj.annotations = annotations
  return "```json-attributes\n" + JSON.stringify(obj) + "\n```"
}

describe("extractSearchSlice", () => {
  const cases: {
    name: string
    hit: { file: string; id?: string; text?: string }
    fileContent: string
    expected: string | null
  }[] = [
    {
      name: "returns null when no text",
      hit: { file: "doc.md" },
      fileContent: "# Doc",
      expected: null,
    },
    {
      name: "returns null for id-only hit",
      hit: { file: "doc.md", id: "callout-1" },
      fileContent: "# Doc",
      expected: null,
    },
    {
      name: "returns text as-is when no attributes block",
      hit: { file: "doc.md", text: "some chunk content" },
      fileContent: "# Doc\n\nsome chunk content",
      expected: "some chunk content",
    },
    {
      name: "returns text as-is when file content is empty",
      hit: { file: "doc.md", text: "some text" },
      fileContent: "",
      expected: "some text",
    },
    {
      name: "returns text as-is when no annotations overlap",
      hit: { file: "doc.md", text: "paragraph one" },
      fileContent: `paragraph one\n\nparagraph two\n\n${makeAttrs([{ text: "paragraph two", reason: "r", color: "blue" }])}`,
      expected: "paragraph one",
    },
    {
      name: "appends filtered attributes when annotation overlaps",
      hit: { file: "doc.md", text: "key insight here" },
      fileContent: `intro text\n\nkey insight here and more\n\n${makeAttrs([{ text: "key insight here", reason: "important", color: "blue" }])}`,
      expected: `key insight here\n\n${makeAttrs([{ text: "key insight here", reason: "important", color: "blue" }])}`,
    },
    {
      name: "expands text to encompass overlapping annotation",
      hit: { file: "doc.md", text: "insight" },
      fileContent: `some key insight here\n\n${makeAttrs([{ text: "key insight here", reason: "important", color: "blue" }])}`,
      expected: `key insight here\n\n${makeAttrs([{ text: "key insight here", reason: "important", color: "blue" }])}`,
    },
    {
      name: "expands to bounding box of multiple overlapping annotations",
      hit: { file: "doc.md", text: "middle part" },
      fileContent: `left middle part right\n\n${makeAttrs([
        { text: "left middle", reason: "a", color: "blue" },
        { text: "middle part right", reason: "b", color: "red" },
      ])}`,
      expected: `left middle part right\n\n${makeAttrs([
        { text: "left middle", reason: "a", color: "blue" },
        { text: "middle part right", reason: "b", color: "red" },
      ])}`,
    },
    {
      name: "does not cascade to annotations outside original slice",
      hit: { file: "doc.md", text: "BBB" },
      fileContent: `AAA BBB CCC DDD EEE\n\n${makeAttrs([
        { text: "AAA BBB", reason: "a", color: "blue" },
        { text: "DDD EEE", reason: "b", color: "red" },
      ])}`,
      expected: `AAA BBB\n\n${makeAttrs([{ text: "AAA BBB", reason: "a", color: "blue" }])}`,
    },
    {
      name: "preserves tags in filtered attributes block",
      hit: { file: "doc.md", text: "key insight" },
      fileContent: `key insight here\n\n${makeAttrs([{ text: "key insight", reason: "r", color: "blue" }], ["interview"])}`,
      expected:
        `key insight\n\n` +
        makeAttrs([{ text: "key insight", reason: "r", color: "blue" }], ["interview"]),
    },
  ]

  it.each(cases)("$name", ({ hit, fileContent, expected }) => {
    expect(extractSearchSlice(hit, fileContent)).toBe(expected)
  })
})
