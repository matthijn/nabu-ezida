import { describe, expect, it } from "vitest"
import { detectHint, type HintContext } from "./hints"

const jsonCalloutBlock = (lines: number): string => {
  const paddingLines = Array.from(
    { length: Math.max(0, lines - 8) },
    (_, i) => `\t\t"extra_${i}": "value"`
  )
  const extra = paddingLines.length > 0 ? ",\n" + paddingLines.join(",\n") : ""
  return [
    "```json-callout",
    "{",
    '\t"id": "code_abc12345",',
    '\t"type": "codebook",',
    '\t"color": "blue",',
    '\t"content": "Some content here.",',
    `\t"collapsed": false${extra}`,
    "}",
    "```",
  ].join("\n")
}

const makeFileContent = (blockLineCount: number): string =>
  [
    "# Document",
    "",
    "Some text here.",
    "",
    jsonCalloutBlock(blockLineCount),
    "",
    "More text.",
  ].join("\n")

describe("detectHint", () => {
  const cases: { name: string; ctx: HintContext; expected: string | null }[] = [
    {
      name: "JSON structure edit (color change) returns structure hint",
      ctx: {
        fileContent: [
          "# Document",
          "",
          "```json-callout",
          "{",
          '\t"id": "code_abc",',
          '\t"color": "blue",',
          '\t"collapsed": false',
          "}",
          "```",
        ].join("\n"),
        diff: [
          "@@",
          '\t"id": "code_abc",',
          '-\t"color": "blue",',
          '+\t"color": "red",',
          '\t"collapsed": false',
        ].join("\n"),
      },
      expected:
        "Use the typed patch tool (e.g. patch_callout, patch_attributes) for JSON property changes — targets fields by path, no context matching needed.",
    },
    {
      name: "whole block rewrite, large (>15 lines) returns block rewrite hint",
      ctx: {
        fileContent: makeFileContent(20),
        diff: (() => {
          const fileContent = makeFileContent(20)
          const blockLines = fileContent.split("\n").filter((_, i, arr) => {
            const start = arr.indexOf("```json-callout")
            const end = arr.indexOf("```", start + 1)
            return i >= start && i <= end
          })
          return [
            "*** Update File: doc.md",
            "@@",
            ...blockLines.map((l) => `-${l}`),
            "+```json-callout",
            "+{",
            '+\t"id": "code_abc12345",',
            '+\t"type": "codebook",',
            '+\t"color": "red",',
            '+\t"content": "Replaced.",',
            '+\t"collapsed": false',
            "+}",
            "+```",
          ].join("\n")
        })(),
      },
      expected:
        "Use the typed patch tool (e.g. patch_callout, patch_attributes) for property changes in large JSON blocks — more reliable than rewriting the whole block.",
    },
    {
      name: "whole block rewrite, small (<15 lines) returns structure hint",
      ctx: {
        fileContent: [
          "# Document",
          "",
          "```json-attributes",
          "{",
          '\t"tags": ["test"]',
          "}",
          "```",
        ].join("\n"),
        diff: [
          "@@",
          "-```json-attributes",
          "-{",
          '-\t"tags": ["test"]',
          "-}",
          "-```",
          "+```json-attributes",
          "+{",
          '+\t"tags": ["updated"]',
          "+}",
          "+```",
        ].join("\n"),
      },
      expected:
        "Use the typed patch tool (e.g. patch_callout, patch_attributes) for JSON property changes — targets fields by path, no context matching needed.",
    },
    {
      name: "large hunk outside JSON (25 add lines) returns large hunk hint",
      ctx: {
        fileContent:
          "# Document\n\nSome text.\n\n" +
          Array.from({ length: 25 }, (_, i) => `Paragraph ${i + 1}.`).join("\n"),
        diff: [
          "@@",
          ...Array.from({ length: 25 }, (_, i) => `-Paragraph ${i + 1}.`),
          ...Array.from({ length: 25 }, (_, i) => `+New paragraph ${i + 1}.`),
        ].join("\n"),
      },
      expected:
        "Split large patches into one per markdown block — smaller patches match more reliably.",
    },
    {
      name: "large hunk that is range ref returns null",
      ctx: {
        fileContent:
          "# Document\n\nSome text.\n\n" +
          Array.from({ length: 25 }, (_, i) => `Paragraph ${i + 1}.`).join("\n"),
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
        diff: ["@@", "-Some paragraph text here.", "+Updated paragraph text here."].join("\n"),
      },
      expected: null,
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
          '\t"id": "code_abc",',
          '\t"color": "blue"',
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
