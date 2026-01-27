import { describe, it, expect } from "vitest"
import { mdToPlainText, parseMarkdownBlocks, splitByLines, stripAttributesBlock } from "./markdown"

describe("mdToPlainText", () => {
  const cases: { name: string; input: string; expected: string }[] = [
    {
      name: "strips bold markers",
      input: "The **quick** brown fox",
      expected: "The quick brown fox",
    },
    {
      name: "strips italic markers",
      input: "The _quick_ brown fox",
      expected: "The quick brown fox",
    },
    {
      name: "strips heading markers",
      input: "# Hello World",
      expected: "Hello World",
    },
    {
      name: "strips inline code",
      input: "Use `console.log` here",
      expected: "Use console.log here",
    },
    {
      name: "strips links but keeps text",
      input: "Click [here](https://example.com) now",
      expected: "Click here now",
    },
    {
      name: "handles multiple paragraphs",
      input: "First paragraph.\n\nSecond paragraph.",
      expected: "First paragraph.Second paragraph.",
    },
    {
      name: "handles complex markdown",
      input: "# Title\n\nSome **bold** and _italic_ text with `code`.",
      expected: "TitleSome bold and italic text with code.",
    },
  ]

  it.each(cases)("$name", ({ input, expected }) => {
    expect(mdToPlainText(input)).toBe(expected)
  })
})

describe("parseMarkdownBlocks", () => {
  const cases: { name: string; input: string; expected: { type: string; lines: [number, number] }[] }[] = [
    {
      name: "parses heading and paragraph",
      input: "# Title\n\nSome text here.",
      expected: [
        { type: "heading", lines: [1, 1] },
        { type: "paragraph", lines: [3, 3] },
      ],
    },
    {
      name: "parses code block as single block",
      input: "```js\nconst x = 1\nconst y = 2\n```",
      expected: [{ type: "code", lines: [1, 4] }],
    },
    {
      name: "parses list as single block",
      input: "- item 1\n- item 2\n- item 3",
      expected: [{ type: "list", lines: [1, 3] }],
    },
    {
      name: "parses blockquote",
      input: "> quote line 1\n> quote line 2",
      expected: [{ type: "blockquote", lines: [1, 2] }],
    },
    {
      name: "parses mixed content",
      input: "# Heading\n\nParagraph.\n\n- list item\n\n```\ncode\n```",
      expected: [
        { type: "heading", lines: [1, 1] },
        { type: "paragraph", lines: [3, 3] },
        { type: "list", lines: [5, 5] },
        { type: "code", lines: [7, 9] },
      ],
    },
  ]

  it.each(cases)("$name", ({ input, expected }) => {
    const blocks = parseMarkdownBlocks(input)
    expect(blocks.map((b) => ({ type: b.type, lines: [b.startLine, b.endLine] }))).toEqual(expected)
  })

  it("extracts lang from code blocks", () => {
    const input = "```javascript\nconst x = 1\n```"
    const blocks = parseMarkdownBlocks(input)
    expect(blocks[0].lang).toBe("javascript")
  })

  it("returns null lang for non-code blocks", () => {
    const input = "# Heading"
    const blocks = parseMarkdownBlocks(input)
    expect(blocks[0].lang).toBe(null)
  })
})

describe("splitByLines", () => {
  const cases: { name: string; input: string; targetLines: number; expectedChunks: number }[] = [
    {
      name: "single block under target stays together",
      input: "# Title\n\nShort paragraph.",
      targetLines: 10,
      expectedChunks: 1,
    },
    {
      name: "splits at block boundaries",
      input: "# Heading 1\n\nParagraph 1.\n\n# Heading 2\n\nParagraph 2.",
      targetLines: 3,
      expectedChunks: 2,
    },
    {
      name: "keeps code block together even if exceeds target",
      input: "```\nline 1\nline 2\nline 3\nline 4\nline 5\n```",
      targetLines: 3,
      expectedChunks: 1,
    },
    {
      name: "keeps list together",
      input: "Intro.\n\n- item 1\n- item 2\n- item 3\n- item 4\n\nOutro.",
      targetLines: 4,
      expectedChunks: 2, // Intro + list stay together (5 lines), then Outro
    },
  ]

  it.each(cases)("$name", ({ input, targetLines, expectedChunks }) => {
    const chunks = splitByLines(input, targetLines)
    expect(chunks.length).toBe(expectedChunks)
  })

  it("preserves content across chunks", () => {
    const input = "# Title\n\nParagraph.\n\n- item 1\n- item 2"
    const chunks = splitByLines(input, 3)
    const rejoined = chunks.join("\n\n")
    expect(rejoined).toContain("# Title")
    expect(rejoined).toContain("Paragraph.")
    expect(rejoined).toContain("- item 1")
    expect(rejoined).toContain("- item 2")
  })

  it("strips attributes block when option enabled", () => {
    const input = `# Title

\`\`\`json-attributes
{
  "tags": ["interview"],
  "annotations": []
}
\`\`\`

Some content here.`
    const chunks = splitByLines(input, 50, { stripAttributes: true })
    const rejoined = chunks.join("\n\n")
    expect(rejoined).toContain("# Title")
    expect(rejoined).toContain("Some content here.")
    expect(rejoined).not.toContain("json-attributes")
    expect(rejoined).not.toContain("tags")
  })

  it("keeps attributes block when option not set", () => {
    const input = `# Title

\`\`\`json-attributes
{"tags": ["test"]}
\`\`\`

Content.`
    const chunks = splitByLines(input, 50)
    const rejoined = chunks.join("\n\n")
    expect(rejoined).toContain("json-attributes")
  })
})

describe("stripAttributesBlock", () => {
  const cases: { name: string; input: string; expected: string }[] = [
    {
      name: "strips attributes block from content",
      input: `# Title

\`\`\`json-attributes
{"tags": ["interview"]}
\`\`\`

Content here.`,
      expected: `# Title

Content here.`,
    },
    {
      name: "handles content without attributes block",
      input: "# Title\n\nJust content.",
      expected: "# Title\n\nJust content.",
    },
    {
      name: "strips multiple attributes blocks",
      input: `\`\`\`json-attributes
{"a": 1}
\`\`\`

Text.

\`\`\`json-attributes
{"b": 2}
\`\`\``,
      expected: "Text.",
    },
    {
      name: "preserves other code blocks",
      input: `\`\`\`json-attributes
{"tags": []}
\`\`\`

\`\`\`javascript
const x = 1
\`\`\``,
      expected: `\`\`\`javascript
const x = 1
\`\`\``,
    },
  ]

  it.each(cases)("$name", ({ input, expected }) => {
    expect(stripAttributesBlock(input)).toBe(expected)
  })
})
