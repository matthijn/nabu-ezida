import { describe, it, expect } from "vitest"
import { extractSearchSlice, refreshHits } from "./slices"

const makeAnnotations = (annotations: { text: string; reason: string; color: string }[]): string =>
  "```json-annotations\n" + JSON.stringify({ annotations }) + "\n```"

const makeAttrs = (attrs: { tags?: string[] }): string =>
  "```json-attributes\n" + JSON.stringify(attrs) + "\n```"

const makeDoc = (
  prose: string,
  annotations: { text: string; reason: string; color: string }[],
  tags?: string[]
): string => {
  const parts = [prose]
  if (tags) parts.push(makeAttrs({ tags }))
  parts.push(makeAnnotations(annotations))
  return parts.join("\n\n")
}

const formatExpectedBlock = (
  annotations: { text: string; reason: string; color: string }[]
): string => "```json-annotations\n" + JSON.stringify({ annotations }) + "\n```"

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
      name: "returns text as-is when no annotations block",
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
      fileContent: makeDoc("paragraph one\n\nparagraph two", [
        { text: "paragraph two", reason: "r", color: "blue" },
      ]),
      expected: "paragraph one",
    },
    {
      name: "appends overlapping annotations block",
      hit: { file: "doc.md", text: "key insight here" },
      fileContent: makeDoc("intro text\n\nkey insight here and more", [
        { text: "key insight here", reason: "important", color: "blue" },
      ]),
      expected: `key insight here\n\n${formatExpectedBlock([{ text: "key insight here", reason: "important", color: "blue" }])}`,
    },
    {
      name: "expands text to encompass overlapping annotation",
      hit: { file: "doc.md", text: "insight" },
      fileContent: makeDoc("some key insight here", [
        { text: "key insight here", reason: "important", color: "blue" },
      ]),
      expected: `key insight here\n\n${formatExpectedBlock([{ text: "key insight here", reason: "important", color: "blue" }])}`,
    },
    {
      name: "expands to bounding box of multiple overlapping annotations",
      hit: { file: "doc.md", text: "middle part" },
      fileContent: makeDoc("left middle part right", [
        { text: "left middle", reason: "a", color: "blue" },
        { text: "middle part right", reason: "b", color: "red" },
      ]),
      expected: `left middle part right\n\n${formatExpectedBlock([
        { text: "left middle", reason: "a", color: "blue" },
        { text: "middle part right", reason: "b", color: "red" },
      ])}`,
    },
    {
      name: "does not cascade to annotations outside original slice",
      hit: { file: "doc.md", text: "BBB" },
      fileContent: makeDoc("AAA BBB CCC DDD EEE", [
        { text: "AAA BBB", reason: "a", color: "blue" },
        { text: "DDD EEE", reason: "b", color: "red" },
      ]),
      expected: `AAA BBB\n\n${formatExpectedBlock([{ text: "AAA BBB", reason: "a", color: "blue" }])}`,
    },
    {
      name: "ignores tags in attributes block",
      hit: { file: "doc.md", text: "key insight" },
      fileContent: makeDoc(
        "key insight here",
        [{ text: "key insight", reason: "r", color: "blue" }],
        ["interview"]
      ),
      expected:
        `key insight\n\n` +
        formatExpectedBlock([{ text: "key insight", reason: "r", color: "blue" }]),
    },
  ]

  it.each(cases)("$name", ({ hit, fileContent, expected }) => {
    expect(extractSearchSlice(hit, fileContent)).toBe(expected)
  })
})

describe("refreshHits", () => {
  const ann = (text: string) => ({ text, reason: "r", color: "blue" })

  const refreshCases: {
    name: string
    hits: { file: string; id?: string; text?: string }[]
    files: Record<string, string>
    expected: { file: string; id?: string; text?: string }[]
  }[] = [
    {
      name: "drops hit when file is gone",
      hits: [{ file: "gone.md", text: "hello" }],
      files: {},
      expected: [],
    },
    {
      name: "drops ID hit when ID no longer in file",
      hits: [{ file: "doc.md", id: "deleted-id" }],
      files: { "doc.md": "# Doc\n\nSome content" },
      expected: [],
    },
    {
      name: "keeps ID hit when ID still in file",
      hits: [{ file: "doc.md", id: "alive-id" }],
      files: { "doc.md": '# Doc\n\n```json-callout\n{"id":"alive-id"}\n```' },
      expected: [{ file: "doc.md", id: "alive-id" }],
    },
    {
      name: "keeps file-only hit when file exists",
      hits: [{ file: "doc.md" }],
      files: { "doc.md": "# Doc" },
      expected: [{ file: "doc.md" }],
    },
    {
      name: "keeps text hit and strips stale annotations",
      hits: [
        {
          file: "doc.md",
          text: `hello world\n\n${makeAnnotations([ann("hello")])}`,
        },
      ],
      files: { "doc.md": "hello world\n\nother stuff" },
      expected: [{ file: "doc.md", text: "hello world" }],
    },
    {
      name: "keeps text hit and re-grows with surviving annotations",
      hits: [
        {
          file: "doc.md",
          text: `hello world\n\n${makeAnnotations([ann("hello"), ann("missing")])}`,
        },
      ],
      files: {
        "doc.md": makeDoc("hello world\n\nother stuff", [ann("hello")]),
      },
      expected: [
        {
          file: "doc.md",
          text: `hello world\n\n${formatExpectedBlock([ann("hello")])}`,
        },
      ],
    },
  ]

  it.each(refreshCases)("$name", ({ hits, files, expected }) => {
    expect(refreshHits(hits, files)).toEqual(expected)
  })
})
