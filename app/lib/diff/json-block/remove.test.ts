import { describe, it, expect } from "vitest"
import { generateBlockRemovalDiff } from "./remove"
import { applyDiff } from "~/lib/diff"

const block = (language: string, json: object): string =>
  "```" + language + "\n" + JSON.stringify(json, null, 2) + "\n```"

describe("generateBlockRemovalDiff", () => {
  type Case = {
    name: string
    doc: string
    language: string
    id?: string
    expectOk: boolean
    expectError?: string | RegExp
  }

  const singleBlockDoc = `# Title\n\nSome text.\n\n${block("json-attributes", { id: "attr_1", color: "red" })}\n\nMore text.\n`

  const multiBlockDoc = [
    "# Title",
    "",
    block("json-callout", { id: "call_1", text: "first" }),
    "",
    "Middle text.",
    "",
    block("json-callout", { id: "call_2", text: "second" }),
    "",
    "End.",
  ].join("\n")

  const cases: Case[] = [
    {
      name: "removes singleton block by language",
      doc: singleBlockDoc,
      language: "json-attributes",
      expectOk: true,
    },
    {
      name: "removes block by language + id",
      doc: multiBlockDoc,
      language: "json-callout",
      id: "call_1",
      expectOk: true,
    },
    {
      name: "removes second block by id",
      doc: multiBlockDoc,
      language: "json-callout",
      id: "call_2",
      expectOk: true,
    },
    {
      name: "error when no block of language found",
      doc: "# Just text\n",
      language: "json-attributes",
      expectOk: false,
      expectError: /No .* block found/,
    },
    {
      name: "error when id not found",
      doc: singleBlockDoc,
      language: "json-attributes",
      id: "nonexistent",
      expectOk: false,
      expectError: /no .* block with id/i,
    },
    {
      name: "error when multiple blocks and no id",
      doc: multiBlockDoc,
      language: "json-callout",
      expectOk: false,
      expectError: /Multiple .* blocks found/,
    },
  ]

  it.each(cases)("$name", ({ doc, language, id, expectOk, expectError }) => {
    const result = generateBlockRemovalDiff(doc, language, id)
    expect(result.ok).toBe(expectOk)
    if (!expectOk && expectError) {
      expect((result as { error: string }).error).toMatch(expectError)
    }
  })

  type ApplyCase = {
    name: string
    doc: string
    language: string
    id?: string
    expectAbsent: string
    expectPresent: string[]
  }

  const applyCases: ApplyCase[] = [
    {
      name: "applying patch removes the block from document",
      doc: singleBlockDoc,
      language: "json-attributes",
      expectAbsent: "json-attributes",
      expectPresent: ["# Title", "Some text.", "More text."],
    },
    {
      name: "applying patch removes first block, keeps second",
      doc: multiBlockDoc,
      language: "json-callout",
      id: "call_1",
      expectAbsent: "call_1",
      expectPresent: ["call_2", "Middle text.", "End."],
    },
    {
      name: "applying patch removes second block, keeps first",
      doc: multiBlockDoc,
      language: "json-callout",
      id: "call_2",
      expectAbsent: "call_2",
      expectPresent: ["call_1", "Middle text.", "End."],
    },
  ]

  it.each(applyCases)("$name", ({ doc, language, id, expectAbsent, expectPresent }) => {
    const result = generateBlockRemovalDiff(doc, language, id)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const applied = applyDiff(doc, result.patch)
    expect(applied.ok).toBe(true)
    if (!applied.ok) return

    expect(applied.content).not.toContain(expectAbsent)
    for (const text of expectPresent) {
      expect(applied.content).toContain(text)
    }
  })
})
