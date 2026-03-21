import { describe, it, expect } from "vitest"
import {
  extractFileIntro,
  extractSnippetAroundId,
  findHighlightOccurrences,
  expandFileHits,
  type Snippet,
} from "./snippets"
import type { SearchHit } from "~/domain/search"

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

describe("findHighlightOccurrences", () => {
  const cases: {
    name: string
    file: string
    content: string
    highlights: string[]
    expected: SearchHit[]
  }[] = [
    {
      name: "finds single term on multiple lines",
      file: "doc.md",
      content: "Rutte said something.\nThen more text.\nRutte replied.",
      highlights: ["Rutte"],
      expected: [
        { type: "text", file: "doc.md", line: 1, term: "Rutte" },
        { type: "text", file: "doc.md", line: 3, term: "Rutte" },
      ],
    },
    {
      name: "case-insensitive matching",
      file: "doc.md",
      content: "rutte spoke.\nRUTTE responded.",
      highlights: ["Rutte"],
      expected: [
        { type: "text", file: "doc.md", line: 1, term: "Rutte" },
        { type: "text", file: "doc.md", line: 2, term: "Rutte" },
      ],
    },
    {
      name: "multiple terms on same line deduplicates by line",
      file: "doc.md",
      content: "Rutte and Geert met.\nOnly Geert spoke.",
      highlights: ["Rutte", "Geert"],
      expected: [
        { type: "text", file: "doc.md", line: 1, term: "Rutte" },
        { type: "text", file: "doc.md", line: 2, term: "Geert" },
      ],
    },
    {
      name: "returns empty for no matches",
      file: "doc.md",
      content: "Nothing relevant here.",
      highlights: ["Rutte"],
      expected: [],
    },
    {
      name: "returns empty for empty highlights",
      file: "doc.md",
      content: "Rutte is here.",
      highlights: [],
      expected: [],
    },
    {
      name: "results sorted by line number",
      file: "doc.md",
      content: "Geert first.\nMiddle.\nRutte last.",
      highlights: ["Rutte", "Geert"],
      expected: [
        { type: "text", file: "doc.md", line: 1, term: "Geert" },
        { type: "text", file: "doc.md", line: 3, term: "Rutte" },
      ],
    },
  ]

  it.each(cases)("$name", ({ file, content, highlights, expected }) => {
    expect(findHighlightOccurrences(file, content, highlights)).toEqual(expected)
  })
})

describe("expandFileHits", () => {
  const contentMap: Record<string, string> = {
    "a.md": "Rutte spoke.\nSomething else.\nRutte again.",
    "b.md": "No matches here.",
  }
  const getContent = (file: string) => contentMap[file]

  const cases: {
    name: string
    hits: SearchHit[]
    highlights: string[]
    expected: SearchHit[]
  }[] = [
    {
      name: "expands file hits into text hits",
      hits: [{ type: "file", file: "a.md" }],
      highlights: ["Rutte"],
      expected: [
        { type: "text", file: "a.md", line: 1, term: "Rutte" },
        { type: "text", file: "a.md", line: 3, term: "Rutte" },
      ],
    },
    {
      name: "preserves hit-type hits unchanged",
      hits: [{ type: "hit", file: "a.md", id: "ann-1" }],
      highlights: ["Rutte"],
      expected: [{ type: "hit", file: "a.md", id: "ann-1" }],
    },
    {
      name: "keeps file hit when no occurrences found",
      hits: [{ type: "file", file: "b.md" }],
      highlights: ["Rutte"],
      expected: [{ type: "file", file: "b.md" }],
    },
    {
      name: "returns hits unchanged when highlights is empty",
      hits: [{ type: "file", file: "a.md" }],
      highlights: [],
      expected: [{ type: "file", file: "a.md" }],
    },
    {
      name: "keeps file hit when content not found",
      hits: [{ type: "file", file: "missing.md" }],
      highlights: ["Rutte"],
      expected: [{ type: "file", file: "missing.md" }],
    },
    {
      name: "mixes expanded and preserved hits",
      hits: [
        { type: "file", file: "a.md" },
        { type: "hit", file: "a.md", id: "ann-1" },
      ],
      highlights: ["Rutte"],
      expected: [
        { type: "text", file: "a.md", line: 1, term: "Rutte" },
        { type: "text", file: "a.md", line: 3, term: "Rutte" },
        { type: "hit", file: "a.md", id: "ann-1" },
      ],
    },
  ]

  it.each(cases)("$name", ({ hits, highlights, expected }) => {
    expect(expandFileHits(hits, highlights, getContent)).toEqual(expected)
  })
})
