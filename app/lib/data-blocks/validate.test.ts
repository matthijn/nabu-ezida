import { describe, it, expect } from "vitest"
import { validateMarkdownBlocks } from "./validate"
import { extractProse } from "./parse"

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

\`\`\`json-annotations
{"annotations": [{"text": "cats", "reason": "animal", "color": "red"}]}
\`\`\``,
        expectValid: true,
        expectWarnings: false,
      },
      {
        name: "recovers when annotation text not in prose (drops bad item)",
        markdown: `# Document

This document has no animals.

\`\`\`json-annotations
{"annotations": [{"text": "cats", "reason": "animal", "color": "red"}]}
\`\`\``,
        expectValid: true,
        expectWarnings: true,
        expectWarningContains: "not found in document",
      },
      {
        name: "text match is case insensitive",
        markdown: `# Document

CATS are great.

\`\`\`json-annotations
{"annotations": [{"text": "cats", "reason": "animal", "color": "red"}]}
\`\`\``,
        expectValid: true,
        expectWarnings: false,
      },
    ]

    it.each(cases)("$name", ({ markdown, expectValid, expectWarnings, expectWarningContains }) => {
      const result = validateMarkdownBlocks(markdown)
      expect(result.valid).toBe(expectValid)
      if (expectWarnings) {
        expect(result.warnings.length).toBeGreaterThan(0)
      }
      if (expectWarningContains) {
        expect(result.warnings.some((w) => w.includes(expectWarningContains))).toBe(true)
      }
    })
  })

  describe("annotation code validation", () => {
    const cases = [
      {
        name: "accepts annotation when code exists",
        markdown: `# Test

\`\`\`json-annotations
{"annotations": [{"text": "test", "reason": "note", "code": "abc123"}]}
\`\`\``,
        context: {
          documentProse: "This is a test.",
          availableCodes: [{ id: "abc123", name: "Theme" }],
          availableTags: [],
        },
        expectValid: true,
        expectWarnings: false,
      },
      {
        name: "recovers when annotation code not found (drops bad item)",
        markdown: `# Test

\`\`\`json-annotations
{"annotations": [{"text": "test", "reason": "note", "code": "nonexistent"}]}
\`\`\``,
        context: {
          documentProse: "This is a test.",
          availableCodes: [{ id: "abc123", name: "Theme" }],
          availableTags: [],
        },
        expectValid: true,
        expectWarnings: true,
        expectWarningContains: "not found",
      },
    ]

    it.each(cases)(
      "$name",
      ({ markdown, context, expectValid, expectWarnings, expectWarningContains }) => {
        const result = validateMarkdownBlocks(markdown, { context })
        expect(result.valid).toBe(expectValid)
        if (expectWarnings) {
          expect(result.warnings.length).toBeGreaterThan(0)
        }
        if (expectWarningContains) {
          expect(result.warnings.some((w) => w.includes(expectWarningContains))).toBe(true)
        }
      }
    )
  })

  describe("partial recovery", () => {
    const cases = [
      {
        name: "keeps good annotations and drops bad ones",
        markdown: `# Doc

Here is some existing text to annotate.

\`\`\`json-annotations
{"annotations": [{"text": "existing text", "reason": "good", "color": "red"}, {"text": "nonexistent", "reason": "bad", "color": "blue"}]}
\`\`\``,
        expectValid: true,
        expectRecoveredMarkdown: true,
        expectWarnings: true,
      },
      {
        name: "recoveredMarkdown contains only valid annotations",
        markdown: `# Doc

Hello world here.

\`\`\`json-annotations
{"annotations": [{"text": "Hello world", "reason": "greeting", "color": "red"}, {"text": "NOPE", "reason": "missing", "color": "blue"}]}
\`\`\``,
        expectValid: true,
        expectRecoveredMarkdown: true,
        expectRecoveredContains: "Hello world",
        expectRecoveredNotContains: "NOPE",
      },
    ]

    it.each(cases)(
      "$name",
      ({
        markdown,
        expectValid,
        expectRecoveredMarkdown,
        expectWarnings,
        expectRecoveredContains,
        expectRecoveredNotContains,
      }) => {
        const result = validateMarkdownBlocks(markdown)
        expect(result.valid).toBe(expectValid)
        if (expectRecoveredMarkdown) {
          expect(result.recoveredMarkdown).toBeDefined()
        }
        if (expectWarnings) {
          expect(result.warnings.length).toBeGreaterThan(0)
        }
        if (expectRecoveredContains) {
          expect(result.recoveredMarkdown).toContain(expectRecoveredContains)
        }
        if (expectRecoveredNotContains) {
          expect(result.recoveredMarkdown).not.toContain(expectRecoveredNotContains)
        }
      }
    )
  })

  describe("tag validation", () => {
    const cases = [
      {
        name: "accepts tag when ID exists in settings",
        markdown: `# Doc\n\n\`\`\`json-attributes\n{"tags": ["tag-abc"]}\n\`\`\``,
        context: {
          documentProse: "Doc",
          availableCodes: [],
          availableTags: [{ id: "tag-abc", label: "interview" }],
        },
        expectValid: true,
        expectWarnings: false,
      },
      {
        name: "recovers when tag ID not in settings (drops bad tag)",
        markdown: `# Doc\n\n\`\`\`json-attributes\n{"tags": ["tag-unknown"]}\n\`\`\``,
        context: {
          documentProse: "Doc",
          availableCodes: [],
          availableTags: [{ id: "tag-abc", label: "interview" }],
        },
        expectValid: true,
        expectWarnings: true,
      },
      {
        name: "skips validation when no tags defined",
        markdown: `# Doc\n\n\`\`\`json-attributes\n{"tags": ["any-tag"]}\n\`\`\``,
        context: {
          documentProse: "Doc",
          availableCodes: [],
          availableTags: [],
        },
        expectValid: true,
        expectWarnings: false,
      },
    ]

    it.each(cases)(
      "$name",
      ({ markdown, context, expectValid, expectErrorContains, expectWarnings }) => {
        const result = validateMarkdownBlocks(markdown, { context })
        expect(result.valid).toBe(expectValid)
        if (!expectValid && expectErrorContains) {
          expect(result.errors.some((e) => e.message.includes(expectErrorContains))).toBe(true)
        }
        if (expectWarnings) {
          expect(result.warnings.length).toBeGreaterThan(0)
        }
      }
    )
  })

  describe("currentBlock in errors", () => {
    it("matches blocks by id for non-singleton blocks", () => {
      const validCallout1 =
        '{"id": "first", "type": "codebook-code", "title": "First", "color": "red", "content": "desc", "collapsed": false}'
      const validCallout2 =
        '{"id": "second", "type": "codebook-code", "title": "Second", "color": "blue", "content": "desc", "collapsed": false}'
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

      const patched = ["# Test", "", "```json-callout", '{"type": "INVALID"}', "```"].join("\n")

      const result = validateMarkdownBlocks(patched, { original })

      expect(result.valid).toBe(false)
      const missingIdError = result.errors.find((e) => e.message.includes("missing identifier"))
      expect(missingIdError).toBeDefined()
    })

    it("matches by id even when block order changes", () => {
      const calloutA =
        '{"id": "aaa", "type": "codebook-code", "title": "AAA", "color": "red", "content": "desc", "collapsed": false}'
      const calloutB =
        '{"id": "bbb", "type": "codebook-code", "title": "BBB", "color": "blue", "content": "desc", "collapsed": false}'
      const invalidB = '{"id": "bbb", "type": "INVALID"}'

      const original = [
        "```json-callout",
        calloutA,
        "```",
        "",
        "```json-callout",
        calloutB,
        "```",
      ].join("\n")

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
      const errorWithCurrentBlock = result.errors.find((e) => e.currentBlock)
      expect(errorWithCurrentBlock?.currentBlock).toContain("BBB")
      expect(errorWithCurrentBlock?.currentBlock).not.toContain("AAA")
    })
  })

  describe("file constraint validation", () => {
    const settingsBlock = `\`\`\`json-settings\n{"tags": []}\n\`\`\``

    const cases = [
      {
        name: "accepts json-settings in settings.hidden.md",
        markdown: `# Settings\n\n${settingsBlock}`,
        path: "settings.hidden.md" as string | undefined,
        expectValid: true,
      },
      {
        name: "rejects json-settings in other files",
        markdown: `# Doc\n\n${settingsBlock}`,
        path: "some_doc.md" as string | undefined,
        expectValid: false,
        expectErrorContains: "can only exist in",
      },
      {
        name: "allows json-attributes in any file",
        markdown: `# Doc\n\n\`\`\`json-attributes\n{"tags": ["tag-1"]}\n\`\`\``,
        path: "any_file.md" as string | undefined,
        expectValid: true,
      },
      {
        name: "skips constraint when no path provided",
        markdown: `# Doc\n\n${settingsBlock}`,
        path: undefined as string | undefined,
        expectValid: true,
      },
    ]

    it.each(cases)("$name", ({ markdown, path, expectValid, expectErrorContains }) => {
      const result = validateMarkdownBlocks(markdown, { path })
      expect(result.valid).toBe(expectValid)
      if (!expectValid && expectErrorContains) {
        expect(result.errors.some((e) => e.message.includes(expectErrorContains))).toBe(true)
      }
    })
  })
})
