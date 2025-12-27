import { describe, it, expect } from "vitest"
import { blocksToTiptap, tiptapToBlocks } from "./index"
import { stylesToMarks, marksToStyles, inlineToTiptap, tiptapToInline } from "./inline"
import type { Block, InlineContent, Styles } from "../block"
import type { JSONContent } from "@tiptap/react"

describe("stylesToMarks", () => {
  const tests: { name: string; input: Styles | undefined; expected: JSONContent["marks"] }[] = [
    { name: "undefined", input: undefined, expected: undefined },
    { name: "empty", input: {}, expected: undefined },
    { name: "bold", input: { bold: true }, expected: [{ type: "bold" }] },
    { name: "italic", input: { italic: true }, expected: [{ type: "italic" }] },
    { name: "multiple", input: { bold: true, italic: true }, expected: [{ type: "bold" }, { type: "italic" }] },
    { name: "strikethrough", input: { strikethrough: true }, expected: [{ type: "strike" }] },
    { name: "code", input: { code: true }, expected: [{ type: "code" }] },
  ]

  tests.forEach(({ name, input, expected }) => {
    it(name, () => expect(stylesToMarks(input)).toEqual(expected))
  })
})

describe("marksToStyles", () => {
  const tests: { name: string; input: JSONContent["marks"]; expected: Styles | undefined }[] = [
    { name: "undefined", input: undefined, expected: undefined },
    { name: "empty", input: [], expected: undefined },
    { name: "bold", input: [{ type: "bold" }], expected: { bold: true } },
    { name: "italic", input: [{ type: "italic" }], expected: { italic: true } },
    { name: "multiple", input: [{ type: "bold" }, { type: "italic" }], expected: { bold: true, italic: true } },
    { name: "strike → strikethrough", input: [{ type: "strike" }], expected: { strikethrough: true } },
  ]

  tests.forEach(({ name, input, expected }) => {
    it(name, () => expect(marksToStyles(input)).toEqual(expected))
  })
})

describe("inlineToTiptap", () => {
  const tests: { name: string; input: InlineContent[]; expected: JSONContent[] }[] = [
    {
      name: "plain text",
      input: [{ type: "text", text: "hello" }],
      expected: [{ type: "text", text: "hello", marks: undefined }],
    },
    {
      name: "bold text",
      input: [{ type: "text", text: "bold", styles: { bold: true } }],
      expected: [{ type: "text", text: "bold", marks: [{ type: "bold" }] }],
    },
    {
      name: "link",
      input: [{ type: "link", text: "click", href: "https://example.com" }],
      expected: [{ type: "text", text: "click", marks: [{ type: "link", attrs: { href: "https://example.com" } }] }],
    },
    {
      name: "link with bold",
      input: [{ type: "link", text: "click", href: "https://example.com", styles: { bold: true } }],
      expected: [{ type: "text", text: "click", marks: [{ type: "link", attrs: { href: "https://example.com" } }, { type: "bold" }] }],
    },
  ]

  tests.forEach(({ name, input, expected }) => {
    it(name, () => expect(inlineToTiptap(input)).toEqual(expected))
  })
})

describe("tiptapToInline", () => {
  const tests: { name: string; input: JSONContent[]; expected: InlineContent[] }[] = [
    {
      name: "plain text",
      input: [{ type: "text", text: "hello" }],
      expected: [{ type: "text", text: "hello", styles: undefined }],
    },
    {
      name: "bold text",
      input: [{ type: "text", text: "bold", marks: [{ type: "bold" }] }],
      expected: [{ type: "text", text: "bold", styles: { bold: true } }],
    },
    {
      name: "link",
      input: [{ type: "text", text: "click", marks: [{ type: "link", attrs: { href: "https://example.com" } }] }],
      expected: [{ type: "link", text: "click", href: "https://example.com", styles: undefined }],
    },
    {
      name: "mention → text",
      input: [{ type: "mention", attrs: { label: "Team" } }],
      expected: [{ type: "text", text: "@Team" }],
    },
  ]

  tests.forEach(({ name, input, expected }) => {
    it(name, () => expect(tiptapToInline(input)).toEqual(expected))
  })
})

describe("blocksToTiptap", () => {
  const tests: { name: string; input: Block[]; expected: JSONContent }[] = [
    {
      name: "empty",
      input: [],
      expected: { type: "doc", content: [] },
    },
    {
      name: "paragraph",
      input: [{ id: "p1", type: "paragraph", content: [{ type: "text", text: "hello" }] }],
      expected: {
        type: "doc",
        content: [{
          type: "paragraph",
          attrs: { blockId: "p1" },
          content: [{ type: "text", text: "hello", marks: undefined }],
        }],
      },
    },
    {
      name: "heading",
      input: [{ id: "h1", type: "heading", props: { level: 2 }, content: [{ type: "text", text: "Title" }] }],
      expected: {
        type: "doc",
        content: [{
          type: "heading",
          attrs: { blockId: "h1", level: 2 },
          content: [{ type: "text", text: "Title", marks: undefined }],
        }],
      },
    },
    {
      name: "quote → blockquote",
      input: [{ id: "q1", type: "quote", content: [{ type: "text", text: "Quote" }] }],
      expected: {
        type: "doc",
        content: [{
          type: "blockquote",
          attrs: { blockId: "q1" },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Quote", marks: undefined }] }],
        }],
      },
    },
    {
      name: "checkListItems → taskList",
      input: [
        { id: "t1", type: "checkListItem", props: { checked: true }, content: [{ type: "text", text: "Done" }] },
        { id: "t2", type: "checkListItem", props: { checked: false }, content: [{ type: "text", text: "Todo" }] },
      ],
      expected: {
        type: "doc",
        content: [{
          type: "taskList",
          content: [
            {
              type: "taskItem",
              attrs: { blockId: "t1", checked: true },
              content: [{ type: "paragraph", content: [{ type: "text", text: "Done", marks: undefined }] }],
            },
            {
              type: "taskItem",
              attrs: { blockId: "t2", checked: false },
              content: [{ type: "paragraph", content: [{ type: "text", text: "Todo", marks: undefined }] }],
            },
          ],
        }],
      },
    },
    {
      name: "nested bulletListItems",
      input: [{
        id: "b1",
        type: "bulletListItem",
        content: [{ type: "text", text: "Parent" }],
        children: [{ id: "b2", type: "bulletListItem", content: [{ type: "text", text: "Child" }] }],
      }],
      expected: {
        type: "doc",
        content: [{
          type: "bulletList",
          content: [{
            type: "listItem",
            attrs: { blockId: "b1" },
            content: [
              { type: "paragraph", content: [{ type: "text", text: "Parent", marks: undefined }] },
              {
                type: "bulletList",
                content: [{
                  type: "listItem",
                  attrs: { blockId: "b2" },
                  content: [{ type: "paragraph", content: [{ type: "text", text: "Child", marks: undefined }] }],
                }],
              },
            ],
          }],
        }],
      },
    },
  ]

  tests.forEach(({ name, input, expected }) => {
    it(name, () => expect(blocksToTiptap(input)).toEqual(expected))
  })
})

describe("tiptapToBlocks", () => {
  const tests: { name: string; input: JSONContent; expected: Block[] }[] = [
    {
      name: "empty doc",
      input: { type: "doc", content: [] },
      expected: [],
    },
    {
      name: "paragraph",
      input: {
        type: "doc",
        content: [{ type: "paragraph", attrs: { blockId: "p1" }, content: [{ type: "text", text: "hello" }] }],
      },
      expected: [{ id: "p1", type: "paragraph", content: [{ type: "text", text: "hello", styles: undefined }] }],
    },
    {
      name: "blockquote → quote",
      input: {
        type: "doc",
        content: [{
          type: "blockquote",
          attrs: { blockId: "q1" },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Quote" }] }],
        }],
      },
      expected: [{ id: "q1", type: "quote", content: [{ type: "text", text: "Quote", styles: undefined }] }],
    },
    {
      name: "taskList → checkListItems",
      input: {
        type: "doc",
        content: [{
          type: "taskList",
          content: [
            { type: "taskItem", attrs: { blockId: "t1", checked: true }, content: [{ type: "paragraph", content: [{ type: "text", text: "Done" }] }] },
            { type: "taskItem", attrs: { blockId: "t2", checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Todo" }] }] },
          ],
        }],
      },
      expected: [
        { id: "t1", type: "checkListItem", props: { checked: true }, content: [{ type: "text", text: "Done", styles: undefined }] },
        { id: "t2", type: "checkListItem", props: { checked: false }, content: [{ type: "text", text: "Todo", styles: undefined }] },
      ],
    },
  ]

  tests.forEach(({ name, input, expected }) => {
    it(name, () => expect(tiptapToBlocks(input)).toEqual(expected))
  })
})

describe("round-trip", () => {
  const tests: { name: string; blocks: Block[] }[] = [
    {
      name: "paragraph with styled text",
      blocks: [
        {
          id: "p1",
          type: "paragraph",
          content: [
            { type: "text", text: "Hello " },
            { type: "text", text: "world", styles: { bold: true } },
          ],
        },
      ],
    },
    {
      name: "heading",
      blocks: [{ id: "h1", type: "heading", props: { level: 2 }, content: [{ type: "text", text: "Title" }] }],
    },
    {
      name: "nested list",
      blocks: [{
        id: "b1",
        type: "bulletListItem",
        content: [{ type: "text", text: "Parent" }],
        children: [{ id: "b2", type: "bulletListItem", content: [{ type: "text", text: "Child" }] }],
      }],
    },
  ]

  tests.forEach(({ name, blocks }) => {
    it(name, () => {
      const tiptap = blocksToTiptap(blocks)
      const result = tiptapToBlocks(tiptap)
      expect(result).toEqual(blocks)
    })
  })
})
