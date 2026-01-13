import type { JSONContent } from "@tiptap/react"
import type { Block } from "../block"
import { inlineToTiptap, tiptapToInline } from "./inline"

type BlockToTiptap = (block: Block) => JSONContent
type TiptapToBlock = (node: JSONContent) => Block | null

// Registry of block → tiptap converters
const toTiptapConverters: Record<string, BlockToTiptap> = {
  paragraph: (block) => ({
    type: "paragraph",
    attrs: { blockId: block.id },
    content: inlineToTiptap(block.content),
  }),

  heading: (block) => ({
    type: "heading",
    attrs: { blockId: block.id, level: block.props?.level ?? 1 },
    content: inlineToTiptap(block.content),
  }),

  quote: (block) => ({
    type: "blockquote",
    attrs: { blockId: block.id },
    content: [{ type: "paragraph", content: inlineToTiptap(block.content) }],
  }),

  codeBlock: (block) => ({
    type: "codeBlock",
    attrs: { blockId: block.id, language: block.props?.language },
    content: block.content?.[0]?.text ? [{ type: "text", text: block.content[0].text }] : undefined,
  }),

  image: (block) => ({
    type: "image",
    attrs: { blockId: block.id, src: block.props?.url, alt: block.props?.caption },
  }),

  table: (block) => ({
    type: "table",
    attrs: { blockId: block.id },
    content: [], // TODO: table cell conversion
  }),
}

export const blockToTiptap = (block: Block): JSONContent => {
  const converter = toTiptapConverters[block.type]
  if (!converter) {
    throw new Error(`unknown block type: ${block.type}`)
  }
  return converter(block)
}

// Registry of tiptap → block converters
const toBlockConverters: Record<string, TiptapToBlock> = {
  paragraph: (node) => ({
    id: node.attrs?.blockId,
    type: "paragraph",
    content: tiptapToInline(node.content),
  }),

  heading: (node) => ({
    id: node.attrs?.blockId,
    type: "heading",
    props: { level: node.attrs?.level ?? 1 },
    content: tiptapToInline(node.content),
  }),

  blockquote: (node) => ({
    id: node.attrs?.blockId,
    type: "quote",
    content: tiptapToInline(node.content?.[0]?.content),
  }),

  codeBlock: (node) => ({
    id: node.attrs?.blockId,
    type: "codeBlock",
    props: node.attrs?.language ? { language: node.attrs.language } : undefined,
    content: node.content?.[0]?.text ? [{ type: "text", text: node.content[0].text }] : undefined,
  }),

  image: (node) => ({
    id: node.attrs?.blockId,
    type: "image",
    props: { url: node.attrs?.src, caption: node.attrs?.alt },
  }),

  table: (node) => ({
    id: node.attrs?.blockId,
    type: "table",
    // TODO: table cell conversion
  }),
}

// Convert TipTap node to block (non-list nodes only)
export const tiptapToBlock = (node: JSONContent): Block | null => {
  const converter = toBlockConverters[node.type ?? ""]
  return converter ? converter(node) : null
}
