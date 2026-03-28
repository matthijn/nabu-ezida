import { describe, it, expect } from "vitest"
import {
  companionFilename,
  sourceFilename,
  isCompanionFile,
  buildCompanionMarkdown,
  parseCompanionEntries,
  fastParseBlockContents,
} from "./companion"
import type { EmbeddingEntry } from "./diff"

describe("companionFilename", () => {
  const cases: { name: string; input: string; expected: string }[] = [
    { name: "simple doc", input: "doc.md", expected: "doc.embeddings.hidden.md" },
    { name: "nested name", input: "my_notes.md", expected: "my_notes.embeddings.hidden.md" },
  ]

  cases.forEach(({ name, input, expected }) => {
    it(name, () => {
      expect(companionFilename(input)).toBe(expected)
    })
  })
})

describe("sourceFilename", () => {
  const cases: { name: string; input: string; expected: string }[] = [
    { name: "companion to source", input: "doc.embeddings.hidden.md", expected: "doc.md" },
    { name: "nested companion", input: "my_notes.embeddings.hidden.md", expected: "my_notes.md" },
  ]

  cases.forEach(({ name, input, expected }) => {
    it(name, () => {
      expect(sourceFilename(input)).toBe(expected)
    })
  })
})

describe("isCompanionFile", () => {
  const cases: { name: string; input: string; expected: boolean }[] = [
    { name: "companion file", input: "doc.embeddings.hidden.md", expected: true },
    { name: "regular markdown", input: "doc.md", expected: false },
    { name: "other hidden file", input: "doc.hidden.md", expected: false },
    { name: "settings file", input: "settings.hidden.md", expected: false },
  ]

  cases.forEach(({ name, input, expected }) => {
    it(name, () => {
      expect(isCompanionFile(input)).toBe(expected)
    })
  })
})

describe("roundtrip", () => {
  it("build then parse recovers entries", () => {
    const entries: EmbeddingEntry[] = [
      { hash: "aaa", text: "hello world", embedding: [0.1, 0.2, 0.3] },
      { hash: "bbb", text: "goodbye", embedding: [0.4, 0.5, 0.6] },
    ]

    const markdown = buildCompanionMarkdown(entries)
    const recovered = parseCompanionEntries(markdown)
    expect(recovered).toEqual(entries)
  })

  it("single entry roundtrip", () => {
    const entries: EmbeddingEntry[] = [{ hash: "abc", text: "solo", embedding: [1.0] }]

    const markdown = buildCompanionMarkdown(entries)
    expect(markdown).toContain("```json-embeddings")
    expect(parseCompanionEntries(markdown)).toEqual(entries)
  })

  it("parse returns empty for no block", () => {
    expect(parseCompanionEntries("just text")).toEqual([])
  })

  it("parse returns empty for invalid json", () => {
    expect(parseCompanionEntries("```json-embeddings\nnot json\n```")).toEqual([])
  })

  it("parse skips blocks with missing fields", () => {
    const markdown = '```json-embeddings\n{"hash":"a"}\n```'
    expect(parseCompanionEntries(markdown)).toEqual([])
  })

  it("filename roundtrip", () => {
    const original = "my_document.md"
    const companion = companionFilename(original)
    const recovered = sourceFilename(companion)
    expect(recovered).toBe(original)
  })
})

describe("fastParseBlockContents", () => {
  const cases: { name: string; input: string; expected: string[] }[] = [
    {
      name: "single block",
      input: '```json-embeddings\n{"hash":"a","text":"hi","embedding":[0.1]}\n```',
      expected: ['{"hash":"a","text":"hi","embedding":[0.1]}'],
    },
    {
      name: "multiple blocks",
      input: '```json-embeddings\n{"hash":"a"}\n```\n\n```json-embeddings\n{"hash":"b"}\n```',
      expected: ['{"hash":"a"}', '{"hash":"b"}'],
    },
    {
      name: "no blocks",
      input: "just plain text",
      expected: [],
    },
    {
      name: "wrong language ignored",
      input: '```json-callout\n{"id":"x"}\n```',
      expected: [],
    },
    {
      name: "roundtrip with buildCompanionMarkdown",
      input: buildCompanionMarkdown([
        { hash: "aaa", text: "hello", embedding: [0.1, 0.2] },
        { hash: "bbb", text: "world", embedding: [0.3, 0.4] },
      ]),
      expected: [
        '{"hash":"aaa","text":"hello","embedding":[0.1,0.2]}',
        '{"hash":"bbb","text":"world","embedding":[0.3,0.4]}',
      ],
    },
  ]

  cases.forEach(({ name, input, expected }) => {
    it(name, () => {
      expect(fastParseBlockContents(input)).toEqual(expected)
    })
  })
})
