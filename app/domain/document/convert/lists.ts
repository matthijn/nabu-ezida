import type { JSONContent } from "@tiptap/react"
import type { Block } from "../block"
import { getListMapping, getListMappingByWrapper, isListItemType } from "./mappings"
import { inlineToTiptap, tiptapToInline } from "./inline"
import { blockToTiptap, tiptapToBlock } from "./blocks"

// Convert list item block to TipTap listItem/taskItem
export const listItemToTiptap = (
  block: Block,
  convertChildren: (blocks: Block[]) => JSONContent[]
): JSONContent => {
  const mapping = getListMapping(block.type as any)
  if (!mapping) throw new Error(`Unknown list item type: ${block.type}`)

  const attrs: JSONContent["attrs"] = { blockId: block.id }
  if (block.type === "checkListItem") {
    attrs.checked = block.props?.checked ?? false
  }

  const itemContent: JSONContent[] = [
    { type: "paragraph", content: inlineToTiptap(block.content) },
  ]

  // Nested children become nested list
  if (block.children && block.children.length > 0) {
    const nestedContent = convertChildren(block.children)
    itemContent.push(...nestedContent)
  }

  return {
    type: mapping.nodeType,
    attrs,
    content: itemContent,
  }
}

// Group consecutive list items of same type into wrapper
export const groupListItems = (
  blocks: Block[],
  convertChildren: (blocks: Block[]) => JSONContent[]
): JSONContent[] => {
  const result: JSONContent[] = []
  let i = 0

  while (i < blocks.length) {
    const block = blocks[i]

    if (isListItemType(block.type)) {
      const mapping = getListMapping(block.type as any)!
      const listItems: JSONContent[] = []

      // Collect consecutive items of same type
      while (i < blocks.length && blocks[i].type === block.type) {
        listItems.push(listItemToTiptap(blocks[i], convertChildren))
        i++
      }

      result.push({ type: mapping.wrapperType, content: listItems })
    } else {
      result.push(blockToTiptap(block))
      i++
    }
  }

  return result
}

// Convert TipTap listItem/taskItem to block
export const tiptapListItemToBlock = (
  node: JSONContent,
  blockType: "bulletListItem" | "numberedListItem" | "checkListItem",
  convertChildren: (content: JSONContent[]) => Block[]
): Block => {
  const paragraph = node.content?.find((c) => c.type === "paragraph")
  const nestedList = node.content?.find((c) =>
    c.type === "bulletList" || c.type === "orderedList" || c.type === "taskList"
  )

  const block: Block = {
    id: node.attrs?.blockId,
    type: blockType,
    content: tiptapToInline(paragraph?.content),
  }

  if (blockType === "checkListItem") {
    block.props = { checked: node.attrs?.checked ?? false }
  }

  // Pass the full nested list wrapper, not just its content
  if (nestedList) {
    const children = convertChildren([nestedList])
    if (children.length > 0) {
      block.children = children
    }
  }

  return block
}

// Ungroup list wrapper into individual blocks
export const ungroupListItems = (
  content: JSONContent[],
  convertChildren: (content: JSONContent[]) => Block[]
): Block[] => {
  const result: Block[] = []

  for (const node of content) {
    const mapping = getListMappingByWrapper(node.type ?? "")

    if (mapping) {
      for (const item of node.content ?? []) {
        result.push(tiptapListItemToBlock(item, mapping.itemType, convertChildren))
      }
    } else {
      const block = tiptapToBlock(node)
      if (block) result.push(block)
    }
  }

  return result
}
