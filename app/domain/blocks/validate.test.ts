import { describe, it, expect } from "vitest"
import { validateMarkdownBlocks, extractProse, type ValidateOptions } from "./validate"

describe("extractProse", () => {
  const cases = [
    {
      name: "removes code blocks from markdown",
      markdown: "Hello\n\n```json\n{}\n```\n\nWorld",
      expected: "Hello\n\n\n\nWorld",
    },
    {
      name: "handles multiple code blocks",
      markdown: "A\n```js\ncode\n```\nB\n```py\nmore\n```\nC",
      expected: "A\n\nB\n\nC",
    },
    {
      name: "returns full text when no code blocks",
      markdown: "Just plain text",
      expected: "Just plain text",
    },
  ]

  it.each(cases)("$name", ({ markdown, expected }) => {
    expect(extractProse(markdown)).toBe(expected)
  })
})

describe("validateMarkdownBlocks", () => {
  describe("annotation text validation", () => {
    const cases = [
      {
        name: "accepts annotation when text exists in prose",
        markdown: `# Document

This is some text about cats and dogs.

\`\`\`json-attributes
{
  "annotations": [{"text": "cats", "reason": "animal", "color": "red"}]
}
\`\`\``,
        expectValid: true,
      },
      {
        name: "rejects annotation when text not in prose",
        markdown: `# Document

This document has no animals.

\`\`\`json-attributes
{
  "annotations": [{"text": "cats", "reason": "animal", "color": "red"}]
}
\`\`\``,
        expectValid: false,
        expectErrorContains: "not found in document",
      },
      {
        name: "text match is case insensitive",
        markdown: `# Document

CATS are great.

\`\`\`json-attributes
{
  "annotations": [{"text": "cats", "reason": "animal", "color": "red"}]
}
\`\`\``,
        expectValid: true,
      },
    ]

    it.each(cases)("$name", ({ markdown, expectValid, expectErrorContains }) => {
      const result = validateMarkdownBlocks(markdown)
      expect(result.valid).toBe(expectValid)
      if (!expectValid && expectErrorContains) {
        expect(result.errors.some((e) => e.message.includes(expectErrorContains))).toBe(true)
      }
    })
  })

  describe("annotation code validation", () => {
    const cases = [
      {
        name: "accepts annotation when code exists",
        markdown: `# Test

\`\`\`json-attributes
{
  "annotations": [{"text": "test", "reason": "note", "code": "abc123"}]
}
\`\`\``,
        context: {
          documentProse: "This is a test.",
          availableCodes: [{ id: "abc123", name: "Theme" }],
        },
        expectValid: true,
      },
      {
        name: "rejects annotation when code not found",
        markdown: `# Test

\`\`\`json-attributes
{
  "annotations": [{"text": "test", "reason": "note", "code": "nonexistent"}]
}
\`\`\``,
        context: {
          documentProse: "This is a test.",
          availableCodes: [{ id: "abc123", name: "Theme" }],
        },
        expectValid: false,
        expectErrorContains: "not found",
        expectHint: { Theme: "abc123" },
      },
    ]

    it.each(cases)("$name", ({ markdown, context, expectValid, expectErrorContains, expectHint }) => {
      const result = validateMarkdownBlocks(markdown, { context })
      expect(result.valid).toBe(expectValid)
      if (!expectValid && expectErrorContains) {
        expect(result.errors.some((e) => e.message.includes(expectErrorContains))).toBe(true)
      }
      if (expectHint) {
        const errorWithHint = result.errors.find((e) => e.hint)
        expect(errorWithHint?.hint).toEqual(expectHint)
      }
    })
  })

  describe("currentBlock in errors", () => {
    it("includes original block content in error when validation fails", () => {
      const original = `# Test

\`\`\`json-attributes
{
  "tags": ["old-tag"]
}
\`\`\``

      const patched = `# Test

\`\`\`json-attributes
{
  "tags": ["old-tag"],
  "annotations": [{"text": "nonexistent", "reason": "test", "color": "red"}]
}
\`\`\``

      const result = validateMarkdownBlocks(patched, { original })

      expect(result.valid).toBe(false)
      expect(result.errors[0].currentBlock).toContain("old-tag")
      expect(result.errors[0].currentBlock).not.toContain("annotations")
    })

    it("matches blocks by id for non-singleton blocks", () => {
      const validCallout1 = '{"id": "first", "type": "codebook-code", "title": "First", "color": "red", "content": "desc", "collapsed": false}'
      const validCallout2 = '{"id": "second", "type": "codebook-code", "title": "Second", "color": "blue", "content": "desc", "collapsed": false}'
      const invalidCallout = '{"id": "second", "type": "INVALID"}'

      const original = [
        "# Test",
        "",
        "```json-callout",
        validCallout1,
        "```",
        "",
        "```json-callout",
        validCallout2,
        "```",
      ].join("\n")

      const patched = [
        "# Test",
        "",
        "```json-callout",
        validCallout1,
        "```",
        "",
        "```json-callout",
        invalidCallout,
        "```",
      ].join("\n")

      const result = validateMarkdownBlocks(patched, { original })

      expect(result.valid).toBe(false)
      // Invalid block has id "second" - should match original with same id
      const secondBlockErrors = result.errors.filter((e) => e.currentBlock?.includes("Second"))
      expect(secondBlockErrors.length).toBeGreaterThan(0)
    })

    it("errors when non-singleton block missing id", () => {
      const original = [
        "# Test",
        "",
        "```json-callout",
        '{"id": "abc", "type": "codebook-code", "title": "Test", "color": "red", "content": "desc", "collapsed": false}',
        "```",
      ].join("\n")

      const patched = [
        "# Test",
        "",
        "```json-callout",
        '{"type": "INVALID"}',
        "```",
      ].join("\n")

      const result = validateMarkdownBlocks(patched, { original })

      expect(result.valid).toBe(false)
      const missingIdError = result.errors.find((e) => e.message.includes("missing identifier"))
      expect(missingIdError).toBeDefined()
    })

    it("matches by id even when block order changes", () => {
      const calloutA = '{"id": "aaa", "type": "codebook-code", "title": "AAA", "color": "red", "content": "desc", "collapsed": false}'
      const calloutB = '{"id": "bbb", "type": "codebook-code", "title": "BBB", "color": "blue", "content": "desc", "collapsed": false}'
      const invalidB = '{"id": "bbb", "type": "INVALID"}'

      // Original order: A, B
      const original = [
        "```json-callout",
        calloutA,
        "```",
        "",
        "```json-callout",
        calloutB,
        "```",
      ].join("\n")

      // Patched order: B (invalid), A - order swapped!
      const patched = [
        "```json-callout",
        invalidB,
        "```",
        "",
        "```json-callout",
        calloutA,
        "```",
      ].join("\n")

      const result = validateMarkdownBlocks(patched, { original })

      expect(result.valid).toBe(false)
      // Should match by id "bbb" -> original BBB, not by index
      const errorWithCurrentBlock = result.errors.find((e) => e.currentBlock)
      expect(errorWithCurrentBlock?.currentBlock).toContain("BBB")
      expect(errorWithCurrentBlock?.currentBlock).not.toContain("AAA")
    })
  })

})
