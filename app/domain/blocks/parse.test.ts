import { describe, it, expect } from "vitest"
import { parseCodeBlocks, findBlocksByLanguage, parseBlockJson, findSingletonBlock } from "./parse"

const block = (lang: string, content: string) => `\`\`\`${lang}\n${content}\n\`\`\``
const crlfBlock = (lang: string, content: string) => `\`\`\`${lang}\r\n${content}\r\n\`\`\``
const trailingSpaceBlock = (lang: string, content: string) => `\`\`\`${lang}  \n${content}\n\`\`\``

describe("parseCodeBlocks", () => {
  const cases: { name: string; input: string; expected: { language: string; content: string }[] }[] = [
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
      input: `# Codebook\n\n\`\`\`json-callout\n{\n  "id": "callout_abc",\n  "type": "codebook-code",\n  "title": "Test Code",\n  "color": "brown",\n  "collapsed": false,\n  "content": "Definition: Something.\\n\\nInclusion criteria:\\n- First\\n- Second"\n}\n\`\`\``,
      expected: [{ language: "json-callout", content: '{\n  "id": "callout_abc",\n  "type": "codebook-code",\n  "title": "Test Code",\n  "color": "brown",\n  "collapsed": false,\n  "content": "Definition: Something.\\n\\nInclusion criteria:\\n- First\\n- Second"\n}' }],
    },
  ]

  cases.forEach(({ name, input, expected }) => {
    it(name, () => {
      const result = parseCodeBlocks(input).map(({ language, content }) => ({ language, content }))
      expect(result).toEqual(expected)
    })
  })
})

describe("findBlocksByLanguage", () => {
  const doc = `${block("json-callout", '{"id":"a"}')}\n${block("json-attributes", '{"x":1}')}\n${block("json-callout", '{"id":"b"}')}`

  const cases: { name: string; language: string; expectedCount: number }[] = [
    { name: "filters by language", language: "json-callout", expectedCount: 2 },
    { name: "different language", language: "json-attributes", expectedCount: 1 },
    { name: "non-existent language", language: "yaml", expectedCount: 0 },
  ]

  cases.forEach(({ name, language, expectedCount }) => {
    it(name, () => {
      expect(findBlocksByLanguage(doc, language)).toHaveLength(expectedCount)
    })
  })
})

describe("parseBlockJson", () => {
  const cases: { name: string; content: string; expected: unknown }[] = [
    { name: "valid JSON", content: '{"a":1}', expected: { a: 1 } },
    { name: "invalid JSON", content: "not json", expected: null },
    { name: "JSON array", content: '[1,2,3]', expected: [1, 2, 3] },
  ]

  cases.forEach(({ name, content, expected }) => {
    it(name, () => {
      const block = { language: "json", content, start: 0, end: 0 }
      expect(parseBlockJson(block)).toEqual(expected)
    })
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
