import { describe, expect, it } from "vitest"
import { buildLineZones, findJsonBlockSpans, type LineZone, type JsonBlockSpan } from "./zone"

describe("buildLineZones", () => {
  const cases: { name: string; content: string; expected: LineZone[] }[] = [
    {
      name: "plain markdown is all outside",
      content: "# Title\n\nSome text here.\n\nMore text.",
      expected: ["outside", "outside", "outside", "outside", "outside"],
    },
    {
      name: "json-attributes block is structure",
      content: '```json-attributes\n{\n  "tags": ["test"]\n}\n```',
      expected: ["structure", "structure", "structure", "structure", "outside"],
    },
    {
      name: "json-callout with prose",
      content: [
        "```json-callout",
        "{",
        '  "id": "code_abc",',
        '  "content": """',
        "Definition: References...",
        "",
        "Inclusion criteria:",
        "- Surveillance",
        '""",',
        '  "color": "red"',
        "}",
        "```",
      ].join("\n"),
      expected: [
        "structure",
        "structure",
        "structure",
        "structure",
        "prose",
        "prose",
        "prose",
        "prose",
        "structure",
        "structure",
        "structure",
        "outside",
      ],
    },
    {
      name: "non-json code block stays outside",
      content: "```python\nprint('hello')\n```",
      expected: ["outside", "outside", "outside"],
    },
    {
      name: "markdown around json block",
      content: "# Document\n\nSome text here.\n\n```json-callout\n{\n  \"id\": \"x\"\n}\n```\n\nMore text.",
      expected: [
        "outside",
        "outside",
        "outside",
        "outside",
        "structure",
        "structure",
        "structure",
        "structure",
        "outside",
        "outside",
        "outside",
      ],
    },
    {
      name: "multiple json blocks",
      content: "```json-attributes\n{}\n```\n\n```json-callout\n{}\n```",
      expected: ["structure", "structure", "outside", "outside", "structure", "structure", "outside"],
    },
    {
      name: "prose close with trailing comma",
      content: '```json-callout\n{\n  "content": """\nHello\n""",\n  "color": "red"\n}\n```',
      expected: ["structure", "structure", "structure", "prose", "structure", "structure", "structure", "outside"],
    },
    {
      name: "prose close bare",
      content: '```json-callout\n{\n  "content": """\nHello\n"""\n}\n```',
      expected: ["structure", "structure", "structure", "prose", "structure", "structure", "outside"],
    },
  ]

  it.each(cases)("$name", ({ content, expected }) => {
    expect(buildLineZones(content)).toEqual(expected)
  })
})

describe("findJsonBlockSpans", () => {
  const cases: { name: string; zones: LineZone[]; expected: JsonBlockSpan[] }[] = [
    {
      name: "no blocks",
      zones: ["outside", "outside", "outside"],
      expected: [],
    },
    {
      name: "single block",
      zones: ["outside", "structure", "structure", "structure", "outside"],
      expected: [{ startLine: 1, endLine: 3, lineCount: 3 }],
    },
    {
      name: "block with prose",
      zones: ["outside", "structure", "structure", "prose", "prose", "structure", "outside"],
      expected: [{ startLine: 1, endLine: 5, lineCount: 5 }],
    },
    {
      name: "multiple blocks",
      zones: ["structure", "structure", "outside", "outside", "structure", "structure", "outside"],
      expected: [
        { startLine: 0, endLine: 1, lineCount: 2 },
        { startLine: 4, endLine: 5, lineCount: 2 },
      ],
    },
    {
      name: "block at end of file (no trailing outside)",
      zones: ["outside", "structure", "structure"],
      expected: [{ startLine: 1, endLine: 2, lineCount: 2 }],
    },
  ]

  it.each(cases)("$name", ({ zones, expected }) => {
    expect(findJsonBlockSpans(zones)).toEqual(expected)
  })
})
