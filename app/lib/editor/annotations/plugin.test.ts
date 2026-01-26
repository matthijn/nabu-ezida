import { describe, it, expect } from "vitest"
import { Schema } from "prosemirror-model"
import { textOffsetToPos } from "./plugin"

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
    hard_break: { group: "inline", inline: true, selectable: false },
  },
})

const createDoc = (paragraphs: string[]) => {
  const children = paragraphs.map((text) =>
    schema.nodes.paragraph.create(null, text ? schema.text(text) : null)
  )
  return schema.nodes.doc.create(null, children)
}

const createDocWithBreaks = (content: Array<string | "br">[]) => {
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
      // doc.textContent should be "ABCD"
      expect(doc.textContent).toBe("ABCD")

      // Prosemirror positions for <doc><p>AB</p><p>CD</p></doc>:
      // 0: before doc
      // 1: start of first p content (before 'A')
      // 2: after 'A', before 'B'
      // 3: after 'B' (end of first p content)
      // 4: between paragraphs
      // 5: start of second p content (before 'C')
      // 6: after 'C', before 'D'
      // 7: after 'D' (end of second p content)

      // So offset 0 ('A') should map to position 1
      // offset 1 ('B') should map to position 2
      // offset 2 ('C') should map to position 5
      // offset 3 ('D') should map to position 6

      expect(textOffsetToPos(doc, 0)).toBe(1)  // 'A'
      expect(textOffsetToPos(doc, 1)).toBe(2)  // 'B'
      expect(textOffsetToPos(doc, 2)).toBe(5)  // 'C' - crosses paragraph boundary
      expect(textOffsetToPos(doc, 3)).toBe(6)  // 'D'
    })
  })
})
