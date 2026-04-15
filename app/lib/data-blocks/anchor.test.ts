import { describe, it, expect } from "vitest"
import { insertBlockAtAnchor, moveBlockToAnchor } from "./anchor"

const calloutBlock = (id: string, title: string): string =>
  [
    "```json-callout",
    JSON.stringify(
      { id, type: "codebook-code", color: "blue", collapsed: false, title, content: "text" },
      null,
      "\t"
    ),
    "```",
  ].join("\n")

const sampleDoc = [
  "# Codebook",
  "",
  "First paragraph with some context.",
  "",
  calloutBlock("callout-abc1234", "Alpha"),
  "",
  "Middle paragraph between blocks.",
  "",
  calloutBlock("callout-def5678", "Beta"),
  "",
  "Final paragraph at the end.",
].join("\n")

describe("insertBlockAtAnchor", () => {
  interface Case {
    name: string
    content: string
    language: string
    anchorContext: string
    idPrefix: string
    expectOk: boolean
    expectError?: RegExp
    expectContains?: string[]
  }

  const cases: Case[] = [
    {
      name: "inserts after single match in prose",
      content: sampleDoc,
      language: "json-callout",
      anchorContext: "Final paragraph at the end.",
      idPrefix: "callout",
      expectOk: true,
      expectContains: ['"id":"callout-'],
    },
    {
      name: "inserts after first paragraph",
      content: sampleDoc,
      language: "json-callout",
      anchorContext: "First paragraph with some context.",
      idPrefix: "callout",
      expectOk: true,
    },
    {
      name: "error when anchor not found",
      content: sampleDoc,
      language: "json-callout",
      anchorContext: "This text does not exist in the document at all.",
      idPrefix: "callout",
      expectOk: false,
      expectError: /not found/i,
    },
    {
      name: "error when anchor is ambiguous",
      content: "# Doc\n\nSame line.\n\nSome prose.\n\nSame line.\n",
      language: "json-callout",
      anchorContext: "Same line.",
      idPrefix: "callout",
      expectOk: false,
      expectError: /ambiguous/i,
    },
    {
      name: "error when anchor resolves inside a block",
      content: sampleDoc,
      language: "json-callout",
      anchorContext: '\t"title": "Alpha",',
      idPrefix: "callout",
      expectOk: false,
      expectError: /inside a data block/i,
    },
  ]

  it.each(cases)(
    "$name",
    ({ content, language, anchorContext, idPrefix, expectOk, expectError, expectContains }) => {
      const result = insertBlockAtAnchor(content, language, anchorContext, idPrefix)

      expect(result.ok).toBe(expectOk)

      if (!result.ok) {
        if (expectError) expect(result.error).toMatch(expectError)
        return
      }

      expect(result.generatedId).toMatch(new RegExp(`^${idPrefix}-\\d[a-z0-9]{6,9}$`))

      if (expectContains) {
        for (const needle of expectContains) {
          expect(result.content).toContain(needle)
        }
      }

      expect(result.content).toContain(`\`\`\`${language}`)
    }
  )
})

describe("moveBlockToAnchor", () => {
  interface Case {
    name: string
    content: string
    language: string
    blockId: string
    anchorContext: string
    expectOk: boolean
    expectError?: RegExp
  }

  const cases: Case[] = [
    {
      name: "moves block to new position",
      content: sampleDoc,
      language: "json-callout",
      blockId: "callout-abc1234",
      anchorContext: "Final paragraph at the end.",
      expectOk: true,
    },
    {
      name: "error when block_id not found",
      content: sampleDoc,
      language: "json-callout",
      blockId: "callout-nonexistent",
      anchorContext: "Final paragraph at the end.",
      expectOk: false,
      expectError: /no.*block.*callout-nonexistent/i,
    },
    {
      name: "error when target anchor not found",
      content: sampleDoc,
      language: "json-callout",
      blockId: "callout-abc1234",
      anchorContext: "This anchor text does not exist anywhere.",
      expectOk: false,
      expectError: /not found/i,
    },
    {
      name: "error when target anchor is ambiguous",
      content: "# Doc\n\nSame.\n\n" + calloutBlock("callout-x1234567", "X") + "\n\nSame.\n",
      language: "json-callout",
      blockId: "callout-x1234567",
      anchorContext: "Same.",
      expectOk: false,
      expectError: /ambiguous/i,
    },
    {
      name: "error when target is inside a block",
      content: sampleDoc,
      language: "json-callout",
      blockId: "callout-abc1234",
      anchorContext: '\t"title": "Beta",',
      expectOk: false,
      expectError: /inside a data block/i,
    },
  ]

  it.each(cases)(
    "$name",
    ({ content, language, blockId, anchorContext, expectOk, expectError }) => {
      const result = moveBlockToAnchor(content, language, blockId, anchorContext)

      expect(result.ok).toBe(expectOk)

      if (!result.ok) {
        if (expectError) expect(result.error).toMatch(expectError)
        return
      }

      expect(result.content).toContain(blockId)
    }
  )
})
