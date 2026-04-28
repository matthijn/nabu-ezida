import { describe, it, expect } from "vitest"
import {
  parseCodeBlocks,
  findBlocksByLanguage,
  parseBlockJson,
  findSingletonBlock,
  findBlockById,
  summarizeBlocks,
  replaceBlockContents,
  ensureFencesOnOwnLines,
} from "./parse"
import { block } from "./test-helpers"

const crlfBlock = (lang: string, content: string) => `\`\`\`${lang}\r\n${content}\r\n\`\`\``
const trailingSpaceBlock = (lang: string, content: string) => `\`\`\`${lang}  \n${content}\n\`\`\``

describe("parseCodeBlocks", () => {
  const cases: {
    name: string
    input: string
    expected: { language: string; content: string }[]
  }[] = [
    {
      name: "single block with LF",
      input: block("json", '{"a":1}'),
      expected: [{ language: "json", content: '{"a":1}' }],
    },
    {
      name: "single block with CRLF",
      input: crlfBlock("json", '{"a":1}'),
      expected: [{ language: "json", content: '{"a":1}' }],
    },
    {
      name: "trailing whitespace after language",
      input: trailingSpaceBlock("json-callout", '{"id":"x"}'),
      expected: [{ language: "json-callout", content: '{"id":"x"}' }],
    },
    {
      name: "multiple blocks",
      input: `${block("json-callout", '{"id":"a"}')}\n\nsome text\n\n${block("json-callout", '{"id":"b"}')}`,
      expected: [
        { language: "json-callout", content: '{"id":"a"}' },
        { language: "json-callout", content: '{"id":"b"}' },
      ],
    },
    {
      name: "mixed languages",
      input: `${block("json-callout", '{"x":1}')}\n${block("json-attributes", '{"y":2}')}`,
      expected: [
        { language: "json-callout", content: '{"x":1}' },
        { language: "json-attributes", content: '{"y":2}' },
      ],
    },
    {
      name: "trims content whitespace",
      input: block("json", '  {"a":1}  '),
      expected: [{ language: "json", content: '{"a":1}' }],
    },
    {
      name: "no blocks",
      input: "just plain text",
      expected: [],
    },
    {
      name: "CRLF throughout document",
      input: `# Title\r\n\r\n\`\`\`json-callout\r\n{"id":"c"}\r\n\`\`\`\r\n\r\nmore text`,
      expected: [{ language: "json-callout", content: '{"id":"c"}' }],
    },
    {
      name: "realistic codebook callout with multiline JSON",
      input: `# Codebook\n\n\`\`\`json-callout\n{\n  "id": "callout-abc",\n  "type": "codebook-code",\n  "title": "Test Code",\n  "color": "brown",\n  "collapsed": false,\n  "content": "Definition: Something.\\n\\nInclusion criteria:\\n- First\\n- Second"\n}\n\`\`\``,
      expected: [
        {
          language: "json-callout",
          content:
            '{\n  "id": "callout-abc",\n  "type": "codebook-code",\n  "title": "Test Code",\n  "color": "brown",\n  "collapsed": false,\n  "content": "Definition: Something.\\n\\nInclusion criteria:\\n- First\\n- Second"\n}',
        },
      ],
    },
  ]

  it.each(cases)("$name", ({ input, expected }) => {
    const result = parseCodeBlocks(input).map(({ language, content }) => ({ language, content }))
    expect(result).toEqual(expected)
  })

  it("returns same reference for identical input (cache hit)", () => {
    const input = block("json", '{"a":1}')
    const first = parseCodeBlocks(input)
    const second = parseCodeBlocks(input)
    expect(second).toBe(first)
  })
})

describe("findBlocksByLanguage", () => {
  const doc = `${block("json-callout", '{"id":"a"}')}\n${block("json-attributes", '{"x":1}')}\n${block("json-callout", '{"id":"b"}')}`

  const cases: { name: string; language: string; expectedCount: number }[] = [
    { name: "filters by language", language: "json-callout", expectedCount: 2 },
    { name: "different language", language: "json-attributes", expectedCount: 1 },
    { name: "non-existent language", language: "yaml", expectedCount: 0 },
  ]

  it.each(cases)("$name", ({ language, expectedCount }) => {
    expect(findBlocksByLanguage(doc, language)).toHaveLength(expectedCount)
  })
})

describe("parseBlockJson", () => {
  const ok = (data: unknown) => ({ ok: true, data })

  const cases: {
    name: string
    content: string
    check: (r: ReturnType<typeof parseBlockJson>) => void
  }[] = [
    {
      name: "valid JSON object",
      content: '{"a":1}',
      check: (r) => expect(r).toEqual(ok({ a: 1 })),
    },
    {
      name: "valid JSON array",
      content: "[1,2,3]",
      check: (r) => expect(r).toEqual(ok([1, 2, 3])),
    },
    {
      name: "invalid JSON returns error and raw snippet",
      content: "not json",
      check: (r) => {
        expect(r.ok).toBe(false)
        if (!r.ok) {
          expect(r.error).toContain("Unexpected token")
          expect(r.raw).toBe("not json")
        }
      },
    },
  ]

  it.each(cases)("$name", ({ content, check }) => {
    check(parseBlockJson({ language: "json", content, start: 0, end: 0 }))
  })
})

describe("findSingletonBlock", () => {
  it("returns first block of language", () => {
    const doc = `${block("json-callout", '{"id":"first"}')}\n${block("json-callout", '{"id":"second"}')}`
    expect(findSingletonBlock(doc, "json-callout")?.content).toBe('{"id":"first"}')
  })

  it("returns undefined for missing language", () => {
    expect(findSingletonBlock("no blocks", "json")).toBeUndefined()
  })
})

describe("findBlockById", () => {
  const multiDoc = `${block("json-callout", '{"id":"c_a","title":"Alpha"}')}\n\nProse.\n\n${block("json-callout", '{"id":"c_b","title":"Beta"}')}`

  interface Case {
    name: string
    id: string
    expectedData: unknown
  }
  const cases: Case[] = [
    { name: "finds first block by id", id: "c_a", expectedData: { id: "c_a", title: "Alpha" } },
    { name: "finds second block by id", id: "c_b", expectedData: { id: "c_b", title: "Beta" } },
    { name: "returns undefined for unknown id", id: "c_nope", expectedData: undefined },
  ]

  it.each(cases)("$name", ({ id, expectedData }) => {
    const result = findBlockById(multiDoc, "json-callout", id)
    if (expectedData === undefined) {
      expect(result).toBeUndefined()
    } else {
      expect(result?.data).toEqual(expectedData)
    }
  })
})

describe("summarizeBlocks", () => {
  const multiDoc = `${block("json-callout", '{"id":"c_a","title":"Alpha"}')}\n${block("json-callout", '{"id":"c_b","title":"Beta"}')}`

  interface Case {
    name: string
    doc: string
    language: string
    labelKey: string | undefined
    expected: { id: string; label: string | undefined }[]
  }
  const cases: Case[] = [
    {
      name: "lists blocks with labels",
      doc: multiDoc,
      language: "json-callout",
      labelKey: "title",
      expected: [
        { id: "c_a", label: "Alpha" },
        { id: "c_b", label: "Beta" },
      ],
    },
    {
      name: "lists blocks without labelKey",
      doc: multiDoc,
      language: "json-callout",
      labelKey: undefined,
      expected: [
        { id: "c_a", label: undefined },
        { id: "c_b", label: undefined },
      ],
    },
    {
      name: "resolves dotted labelKey path",
      doc: `${block("json-chart", '{"id":"ch_1","caption":{"label":"Revenue"}}')}\n${block("json-chart", '{"id":"ch_2","caption":{"label":"Growth"}}')}`,
      language: "json-chart",
      labelKey: "caption.label",
      expected: [
        { id: "ch_1", label: "Revenue" },
        { id: "ch_2", label: "Growth" },
      ],
    },
    {
      name: "empty for missing language",
      doc: multiDoc,
      language: "json-attributes",
      labelKey: undefined,
      expected: [],
    },
  ]

  it.each(cases)("$name", ({ doc, language, labelKey, expected }) => {
    expect(summarizeBlocks(doc, language, labelKey)).toEqual(expected)
  })
})

describe("replaceBlockContents", () => {
  const cases: { name: string; newContent: string }[] = [
    { name: "plain content", newContent: '{"id":"x","value":"hello"}' },
    { name: "content with $' (post-match pattern)", newContent: '{"sql":"WHERE file ~ \'.md$\'"}' },
    { name: "content with $& (matched-text pattern)", newContent: '{"note":"costs $& fees"}' },
    { name: "content with $` (pre-match pattern)", newContent: '{"cmd":"echo $`hostname`"}' },
    { name: "content with $$ (literal dollar)", newContent: '{"price":"$$100"}' },
  ]

  it.each(cases)("$name", ({ newContent }) => {
    const md = `# Doc\n\n${block("json-settings", '{"id":"old"}')}\n\nMore text.`
    const blocks = parseCodeBlocks(md)
    const result = replaceBlockContents(md, [{ block: blocks[0], newContent }])
    expect(result).toContain(newContent)
    expect(result).toContain("```json-settings")
    expect(result).toContain("```\n\nMore text.")
  })
})

describe("ensureFencesOnOwnLines", () => {
  const cases: { name: string; input: string; expected: string }[] = [
    {
      name: "already valid — no change",
      input: "# Doc\n\n```json-callout\n{}\n```\n",
      expected: "# Doc\n\n```json-callout\n{}\n```\n",
    },
    {
      name: "strips leading whitespace from fence",
      input: "# Doc\n\n  ```json-callout\n{}\n  ```\n",
      expected: "# Doc\n\n```json-callout\n{}\n```\n",
    },
    {
      name: "strips tab indentation from fence",
      input: "# Doc\n\n\t```json-callout\n{}\n\t```\n",
      expected: "# Doc\n\n```json-callout\n{}\n```\n",
    },
    {
      name: "splits fence after non-whitespace content",
      input: "some text```json-callout\n{}\n```\n",
      expected: "some text\n```json-callout\n{}\n```\n",
    },
    {
      name: "splits closing fence after content",
      input: "```json-callout\n{}\n}```\n",
      expected: "```json-callout\n{}\n}\n```\n",
    },
    {
      name: "trims trailing whitespace on split before",
      input: "some text  ```json-callout\n{}\n```\n",
      expected: "some text\n```json-callout\n{}\n```\n",
    },
    {
      name: "no fences — identity",
      input: "# Just prose\n\nNo blocks here.",
      expected: "# Just prose\n\nNo blocks here.",
    },
    {
      name: "multiple blocks all valid — no change",
      input: "```json-a\n{}\n```\n\n```json-b\n{}\n```\n",
      expected: "```json-a\n{}\n```\n\n```json-b\n{}\n```\n",
    },
  ]

  it.each(cases)("$name", ({ input, expected }) => {
    expect(ensureFencesOnOwnLines(input)).toBe(expected)
  })
})
