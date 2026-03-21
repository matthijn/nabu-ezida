import { describe, it, expect } from "vitest"
import { extractFileIntro, extractSnippetAroundId, type Snippet } from "./snippets"

describe("extractFileIntro", () => {
  const cases: { name: string; content: string; maxLines?: number; expected: string }[] = [
    {
      name: "returns first N non-empty, non-fence lines",
      content: "# Title\n\nSome intro text.\n\nAnother paragraph.\n\nMore content.",
      maxLines: 3,
      expected: "# Title\nSome intro text.\nAnother paragraph.",
    },
    {
      name: "skips code block fences",
      content: '# Title\n```json-callout\n{"id": "callout-1"}\n```\nParagraph after.',
      maxLines: 2,
      expected: '# Title\n{"id": "callout-1"}',
    },
    {
      name: "uses default maxLines of 5",
      content: "A\nB\nC\nD\nE\nF\nG",
      expected: "A\nB\nC\nD\nE",
    },
    {
      name: "handles empty content",
      content: "",
      maxLines: 3,
      expected: "",
    },
    {
      name: "skips blank lines",
      content: "\n\n# Hello\n\nWorld\n\n",
      maxLines: 2,
      expected: "# Hello\nWorld",
    },
  ]

  it.each(cases)("$name", ({ content, maxLines, expected }) => {
    const result =
      maxLines !== undefined ? extractFileIntro(content, maxLines) : extractFileIntro(content)
    expect(result).toBe(expected)
  })
})

describe("extractSnippetAroundId", () => {
  const doc = [
    "# Document",
    "",
    "Some intro text.",
    "",
    "```json-callout",
    "{",
    '  "id": "callout-abc",',
    '  "title": "Test"',
    "}",
    "```",
    "",
    "Paragraph after callout.",
  ].join("\n")

  const cases: {
    name: string
    content: string
    id: string
    contextLines?: number
    expected: Snippet | null
  }[] = [
    {
      name: "finds snippet around ID with default context",
      content: doc,
      id: "callout-abc",
      expected: {
        line: 7,
        text: [
          "",
          "```json-callout",
          "{",
          '  "id": "callout-abc",',
          '  "title": "Test"',
          "}",
          "```",
        ].join("\n"),
      },
    },
    {
      name: "respects custom context lines",
      content: doc,
      id: "callout-abc",
      contextLines: 1,
      expected: {
        line: 7,
        text: ["{", '  "id": "callout-abc",', '  "title": "Test"'].join("\n"),
      },
    },
    {
      name: "returns null for missing ID",
      content: doc,
      id: "callout-nonexistent",
      expected: null,
    },
    {
      name: "clamps to start of file",
      content: '{\n  "id": "callout-top"\n}',
      id: "callout-top",
      contextLines: 5,
      expected: {
        line: 2,
        text: '{\n  "id": "callout-top"\n}',
      },
    },
    {
      name: "clamps to end of file",
      content: 'first\n{\n  "id": "callout-end"\n}',
      id: "callout-end",
      contextLines: 10,
      expected: {
        line: 3,
        text: 'first\n{\n  "id": "callout-end"\n}',
      },
    },
  ]

  it.each(cases)("$name", ({ content, id, contextLines, expected }) => {
    const result =
      contextLines !== undefined
        ? extractSnippetAroundId(content, id, contextLines)
        : extractSnippetAroundId(content, id)
    expect(result).toEqual(expected)
  })
})
