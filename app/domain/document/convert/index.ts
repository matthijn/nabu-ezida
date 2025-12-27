import type { JSONContent } from "@tiptap/react"
import type { Block } from "../block"
import { groupListItems, ungroupListItems } from "./lists"

// Recursive converter for blocks → TipTap content
const blocksToContent = (blocks: Block[]): JSONContent[] =>
  groupListItems(blocks, blocksToContent)

// Recursive converter for TipTap content → blocks
const contentToBlocks = (content: JSONContent[]): Block[] =>
  ungroupListItems(content, contentToBlocks)

// Main export: Block[] → JSONContent
export const blocksToTiptap = (blocks: Block[]): JSONContent => ({
  type: "doc",
  content: blocksToContent(blocks),
})

// Main export: JSONContent → Block[]
export const tiptapToBlocks = (doc: JSONContent): Block[] =>
  contentToBlocks(doc.content ?? [])
