import { describe, it, expect } from "vitest"
import { extractBlockSlice, extractIntroSlice, extractSearchSlice } from "./slices"
import type { FileStore } from "~/lib/files"

describe("extractBlockSlice", () => {
  const cases: {
    name: string
    content: string
    start: number
    end: number
    expected: string
  }[] = [
    {
      name: "extracts substring by offsets",
      content: "before```json-callout\n{}\n```after",
      start: 6,
      end: 28,
      expected: "```json-callout\n{}\n```",
    },
    {
      name: "handles full content range",
      content: "hello",
      start: 0,
      end: 5,
      expected: "hello",
    },
  ]

  it.each(cases)("$name", ({ content, start, end, expected }) => {
    expect(extractBlockSlice(content, start, end)).toBe(expected)
  })
})

describe("extractIntroSlice", () => {
  const cases: {
    name: string
    content: string
    maxLines?: number
    expected: string
  }[] = [
    {
      name: "takes first N prose lines",
      content: "line1\nline2\nline3\nline4\nline5",
      maxLines: 3,
      expected: "line1\nline2\nline3",
    },
    {
      name: "strips hidden code blocks",
      content: "# Title\n\nSome text.\n\n```json-attributes\n{}\n```",
      maxLines: 10,
      expected: "# Title\n\nSome text.\n",
    },
    {
      name: "strips callout code blocks",
      content: "# Title\n\n```json-callout\n{}\n```\nAfter",
      maxLines: 10,
      expected: "# Title\n\nAfter",
    },
    {
      name: "handles short file",
      content: "short",
      maxLines: 10,
      expected: "short",
    },
    {
      name: "uses default maxLines of 10",
      content: Array.from({ length: 15 }, (_, i) => `L${i}`).join("\n"),
      expected: Array.from({ length: 10 }, (_, i) => `L${i}`).join("\n"),
    },
    {
      name: "strips multiple code blocks",
      content: "A\n```json-callout\n{}\n```\nB\n```json-attributes\n{}\n```\nC",
      maxLines: 10,
      expected: "A\nB\nC",
    },
  ]

  it.each(cases)("$name", ({ content, maxLines, expected }) => {
    const result =
      maxLines !== undefined ? extractIntroSlice(content, maxLines) : extractIntroSlice(content)
    expect(result).toBe(expected)
  })
})

describe("extractSearchSlice", () => {
  const makeFiles = (entries: Record<string, string>): FileStore => entries as FileStore

  const docWithCallout = [
    "# Document",
    "",
    "Intro paragraph.",
    "",
    "```json-callout",
    '{"id":"callout-1","type":"codebook-code","title":"Test","content":"Body","color":"blue","collapsed":false}',
    "```",
    "",
    "After callout.",
  ].join("\n")

  const docWithAnnotation = [
    "# Notes",
    "",
    "The key finding here is important.",
    "",
    "More text follows.",
  ].join("\n")

  const annotationFiles = makeFiles({
    "notes.md":
      docWithAnnotation +
      '\n\n```json-attributes\n{"annotations":[{"id":"ann-1","text":"key finding","color":"red","reason":"critical"}]}\n```',
  })

  const cases: {
    name: string
    hit: { file: string; id?: string; text?: string }
    files: FileStore
    expected: string | null
  }[] = [
    {
      name: "text hit — extracts matched text from stripped prose",
      hit: { file: "doc.md", text: "Intro paragraph" },
      files: makeFiles({ "doc.md": docWithCallout }),
      expected: expect.stringContaining("Intro paragraph") as unknown as string,
    },
    {
      name: "text hit — prose result excludes code blocks",
      hit: { file: "doc.md", text: "Intro paragraph" },
      files: makeFiles({ "doc.md": docWithCallout }),
      expected: expect.not.stringContaining("json-callout") as unknown as string,
    },
    {
      name: "text hit only in code block — returns null",
      hit: { file: "doc.md", text: "Body" },
      files: makeFiles({ "doc.md": docWithCallout }),
      expected: null,
    },
    {
      name: "callout id hit — extracts full callout block",
      hit: { file: "doc.md", id: "callout-1" },
      files: makeFiles({ "doc.md": docWithCallout }),
      expected: expect.stringContaining("json-callout") as unknown as string,
    },
    {
      name: "annotation id hit — extracts prose with annotation attributes",
      hit: { file: "notes.md", id: "ann-1" },
      files: annotationFiles,
      expected: expect.stringContaining("json-attributes") as unknown as string,
    },
    {
      name: "file-only hit — extracts intro without code blocks",
      hit: { file: "doc.md" },
      files: makeFiles({ "doc.md": docWithCallout }),
      expected: expect.not.stringContaining("json-callout") as unknown as string,
    },
    {
      name: "missing file — returns null",
      hit: { file: "missing.md", text: "anything" },
      files: makeFiles({}),
      expected: null,
    },
    {
      name: "text not found in file — returns null",
      hit: { file: "doc.md", text: "nonexistent phrase that won't match" },
      files: makeFiles({ "doc.md": "short" }),
      expected: null,
    },
    {
      name: "unknown id — returns null",
      hit: { file: "doc.md", id: "unknown-id" },
      files: makeFiles({ "doc.md": docWithCallout }),
      expected: null,
    },
  ]

  it.each(cases)("$name", ({ hit, files, expected }) => {
    const result = extractSearchSlice(hit, files)
    if (expected === null) {
      expect(result).toBeNull()
    } else {
      expect(result).toEqual(expected)
    }
  })
})
