import { describe, it, expect } from "vitest"
import { Schema } from "prosemirror-model"
import { textOffsetToPos, proseTextContent } from "./plugin"

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    code_block: { group: "block", content: "text*", code: true },
    text: { group: "inline" },
    hard_break: { group: "inline", inline: true, selectable: false },
  },
})

type BlockDef = string | { code: string }

const isCodeDef = (def: BlockDef): def is { code: string } =>
  typeof def !== "string"

const toNode = (def: BlockDef) =>
  isCodeDef(def)
    ? schema.nodes.code_block.create(null, def.code ? schema.text(def.code) : null)
    : schema.nodes.paragraph.create(null, def ? schema.text(def) : null)

const createDoc = (blocks: BlockDef[]) =>
  schema.nodes.doc.create(null, blocks.map(toNode))

const createDocWithBreaks = (content: (string | "br")[]) => {
  const children: ReturnType<typeof schema.nodes.paragraph.create>[] = []
  let currentPara: Array<ReturnType<typeof schema.text> | ReturnType<typeof schema.nodes.hard_break.create>> = []

  const flushPara = () => {
    if (currentPara.length > 0) {
      children.push(schema.nodes.paragraph.create(null, currentPara))
      currentPara = []
    }
  }

  for (const item of content) {
    if (item === "br") {
      currentPara.push(schema.nodes.hard_break.create())
    } else if (item === "\n") {
      flushPara()
    } else {
      currentPara.push(schema.text(item))
    }
  }
  flushPara()

  return schema.nodes.doc.create(null, children)
}

describe("textOffsetToPos", () => {
  describe("single paragraph", () => {
    const cases = [
      {
        name: "offset 0 returns start of text",
        paragraphs: ["Hello"],
        offset: 0,
        expected: 1,
      },
      {
        name: "offset in middle of text",
        paragraphs: ["Hello"],
        offset: 2,
        expected: 3,
      },
      {
        name: "offset at end of text",
        paragraphs: ["Hello"],
        offset: 5,
        expected: 6,
      },
    ]

    it.each(cases)("$name", ({ paragraphs, offset, expected }) => {
      const doc = createDoc(paragraphs)
      expect(textOffsetToPos(doc, offset)).toBe(expected)
    })
  })

  describe("multiple paragraphs", () => {
    const cases = [
      {
        name: "offset 0 in first paragraph",
        paragraphs: ["Hello", "World"],
        offset: 0,
        expected: 1,
      },
      {
        name: "offset at boundary between paragraphs",
        paragraphs: ["Hello", "World"],
        offset: 5,
        description: "textContent='HelloWorld', offset 5 is 'W'",
        expected: 8,
      },
      {
        name: "offset in second paragraph",
        paragraphs: ["Hello", "World"],
        offset: 7,
        description: "textContent='HelloWorld', offset 7 is 'r'",
        expected: 10,
      },
      {
        name: "three paragraphs - text in third",
        paragraphs: ["AAA", "BBB", "CCC"],
        offset: 6,
        description: "textContent='AAABBBCCC', offset 6 is first 'C'",
        expected: 11,
      },
    ]

    it.each(cases)("$name", ({ paragraphs, offset, expected }) => {
      const doc = createDoc(paragraphs)
      const result = textOffsetToPos(doc, offset)
      expect(result).toBe(expected)
    })

    it("handles hard_break nodes within paragraph", () => {
      const doc = createDocWithBreaks(["Label:", "br", "Content"])
      const contentOffset = doc.textContent.indexOf("Content")
      const pos = textOffsetToPos(doc, contentOffset)
      expect(pos).toBeGreaterThan(1)
    })

    it("documents prosemirror position structure", () => {
      const doc = createDoc(["AB", "CD"])
      expect(doc.textContent).toBe("ABCD")

      expect(textOffsetToPos(doc, 0)).toBe(1)  // 'A'
      expect(textOffsetToPos(doc, 1)).toBe(2)  // 'B'
      expect(textOffsetToPos(doc, 2)).toBe(5)  // 'C' - crosses paragraph boundary
      expect(textOffsetToPos(doc, 3)).toBe(6)  // 'D'
    })
  })

  describe("code block exclusion", () => {
    const cases = [
      {
        name: "proseTextContent excludes code block text",
        blocks: ["Hello", { code: '{"tags": ["interview"]}' }, "World"] as BlockDef[],
        expectedProseText: "HelloWorld",
      },
      {
        name: "proseTextContent with only code block returns empty",
        blocks: [{ code: "some code" }] as BlockDef[],
        expectedProseText: "",
      },
      {
        name: "proseTextContent with code block between paragraphs",
        blocks: ["AAA", { code: "BBB" }, "CCC"] as BlockDef[],
        expectedProseText: "AAACCC",
      },
    ]

    it.each(cases)("$name", ({ blocks, expectedProseText }) => {
      const doc = createDoc(blocks)
      expect(proseTextContent(doc)).toBe(expectedProseText)
    })

    it("textOffsetToPos skips code block and maps to correct paragraph", () => {
      const doc = createDoc([{ code: '{"annotations": []}' }, "Target text"])
      expect(proseTextContent(doc)).toBe("Target text")
      const pos = textOffsetToPos(doc, 0)
      const resolvedText = doc.textBetween(pos, pos + "Target".length)
      expect(resolvedText).toBe("Target")
    })

    it("offset after code block maps to second paragraph", () => {
      const doc = createDoc(["Before", { code: "code content" }, "After"])
      expect(proseTextContent(doc)).toBe("BeforeAfter")
      const afterOffset = "Before".length
      const pos = textOffsetToPos(doc, afterOffset)
      const resolvedText = doc.textBetween(pos, pos + "After".length)
      expect(resolvedText).toBe("After")
    })
  })
})
