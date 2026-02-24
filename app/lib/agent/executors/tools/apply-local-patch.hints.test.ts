import { describe, expect, it } from "vitest"
import { detectHint, type HintContext } from "./apply-local-patch.hints"

const jsonCalloutBlock = (lines: number): string => {
  const contentLines = Array.from({ length: lines - 4 }, (_, i) => `Line ${i + 1} of content.`)
  return [
    "```json-callout",
    "{",
    '  "id": "code_abc12345",',
    '  "type": "codebook",',
    '  "color": "blue",',
    '  "content": """',
    ...contentLines,
    '""",',
    '  "collapsed": false',
    "}",
    "```",
  ].join("\n")
}

const makeFileContent = (blockLineCount: number): string =>
  ["# Document", "", "Some text here.", "", jsonCalloutBlock(blockLineCount), "", "More text."].join("\n")

describe("detectHint", () => {
  const cases: { name: string; ctx: HintContext; expected: string | null }[] = [
    {
      name: "prose edit inside triple-quote returns null",
      ctx: {
        fileContent: [
          "# Document",
          "",
          "```json-callout",
          "{",
          '  "id": "code_abc",',
          '  "content": """',
          "Definition: References to data collection methods.",
          "",
          "Inclusion criteria:",
          "- Surveillance",
          "- Data retention",
          '""",',
          '  "color": "red"',
          "}",
          "```",
        ].join("\n"),
        diff: [
          "@@",
          " Definition: References to data collection methods.",
          "-",
          "+",
          "-Inclusion criteria:",
          "+Updated criteria:",
        ].join("\n"),
      },
      expected: null,
    },
    {
      name: "JSON structure edit (color change) returns structure hint",
      ctx: {
        fileContent: [
          "# Document",
          "",
          "```json-callout",
          "{",
          '  "id": "code_abc",',
          '  "color": "blue",',
          '  "collapsed": false',
          "}",
          "```",
        ].join("\n"),
        diff: [
          "@@",
          ' "id": "code_abc",',
          '-  "color": "blue",',
          '+  "color": "red",',
          ' "collapsed": false',
        ].join("\n"),
      },
      expected: "Use patch_json_block for JSON property changes — targets fields by path, no context matching needed.",
    },
    {
      name: "whole block rewrite, large (>15 lines) returns block rewrite hint",
      ctx: {
        fileContent: makeFileContent(20),
        diff: [
          "*** Update File: doc.md",
          "@@",
          "-```json-callout",
          "-{",
          '-  "id": "code_abc12345",',
          '-  "type": "codebook",',
          '-  "color": "blue",',
          '-  "content": """',
          ...Array.from({ length: 16 }, (_, i) => `-Line ${i + 1} of content.`),
          '-""",',
          '-  "collapsed": false',
          "-}",
          "-```",
          "+```json-callout",
          "+{",
          '+  "id": "code_abc12345",',
          '+  "type": "codebook",',
          '+  "color": "red",',
          '+  "content": """',
          ...Array.from({ length: 16 }, (_, i) => `+New line ${i + 1}.`),
          '+""",',
          '+  "collapsed": false',
          "+}",
          "+```",
        ].join("\n"),
      },
      expected: "Use patch_json_block for property changes in large JSON blocks — more reliable than rewriting the whole block.",
    },
    {
      name: "whole block rewrite, small (<15 lines) returns null",
      ctx: {
        fileContent: [
          "# Document",
          "",
          "```json-attributes",
          "{",
          '  "tags": ["test"]',
          "}",
          "```",
        ].join("\n"),
        diff: [
          "@@",
          "-```json-attributes",
          "-{",
          '-  "tags": ["test"]',
          "-}",
          "-```",
          "+```json-attributes",
          "+{",
          '+  "tags": ["updated"]',
          "+}",
          "+```",
        ].join("\n"),
      },
      expected: "Use patch_json_block for JSON property changes — targets fields by path, no context matching needed.",
    },
    {
      name: "large hunk outside JSON (25 add lines) returns large hunk hint",
      ctx: {
        fileContent: "# Document\n\nSome text.\n\n" + Array.from({ length: 25 }, (_, i) => `Paragraph ${i + 1}.`).join("\n"),
        diff: [
          "@@",
          ...Array.from({ length: 25 }, (_, i) => `-Paragraph ${i + 1}.`),
          ...Array.from({ length: 25 }, (_, i) => `+New paragraph ${i + 1}.`),
        ].join("\n"),
      },
      expected: "Split large patches into one per markdown block — smaller patches match more reliably.",
    },
    {
      name: "large hunk that is range ref returns null",
      ctx: {
        fileContent: "# Document\n\nSome text.\n\n" + Array.from({ length: 25 }, (_, i) => `Paragraph ${i + 1}.`).join("\n"),
        diff: [
          "@@",
          " Some text.",
          "+<< source.md",
          "+  # Section",
          "+  ...",
          "+  End of section.",
        ].join("\n"),
      },
      expected: null,
    },
    {
      name: "edit outside any JSON block returns null",
      ctx: {
        fileContent: "# Title\n\nSome paragraph text here.\n\nMore text below.",
        diff: [
          "@@",
          "-Some paragraph text here.",
          "+Updated paragraph text here.",
        ].join("\n"),
      },
      expected: null,
    },
    {
      name: "mixed prose + structure returns structure hint",
      ctx: {
        fileContent: [
          "```json-callout",
          "{",
          '  "id": "code_abc",',
          '  "color": "blue",',
          '  "content": """',
          "Some prose content.",
          '""",',
          '  "collapsed": false',
          "}",
          "```",
        ].join("\n"),
        diff: [
          "@@",
          '-  "color": "blue",',
          '+  "color": "red",',
          ' "content": """',
          "-Some prose content.",
          "+Updated prose content.",
        ].join("\n"),
      },
      expected: "Use patch_json_block for JSON property changes — targets fields by path, no context matching needed.",
    },
    {
      name: "create_file (no existing content) returns null",
      ctx: {
        fileContent: "",
        diff: "@@\n+# New Document\n+\n+Some content.",
      },
      expected: null,
    },
    {
      name: "pure append at end of file returns null",
      ctx: {
        fileContent: [
          "# Document",
          "",
          "```json-callout",
          "{",
          '  "id": "code_abc",',
          '  "color": "blue"',
          "}",
          "```",
        ].join("\n"),
        diff: "@@\n+\n+New paragraph at the end.",
      },
      expected: null,
    },
  ]

  it.each(cases)("$name", ({ ctx, expected }) => {
    expect(detectHint(ctx)).toBe(expected)
  })
})
