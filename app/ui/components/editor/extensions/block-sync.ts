import type { Editor } from "@tiptap/react"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import type { BlockOp } from "~/domain/document/diff"
import type { Block } from "~/domain/document"
import { blocksToTiptap } from "~/domain/document"

type NodePosition = { node: ProseMirrorNode; pos: number }

const findNodeByBlockId = (editor: Editor, blockId: string): NodePosition | null => {
  let found: NodePosition | null = null
  editor.state.doc.descendants((node, pos) => {
    if (found) return false
    if (node.attrs.blockId === blockId) {
      found = { node, pos }
      return false
    }
    return true
  })
  return found
}

const blockToNode = (editor: Editor, block: Block): ProseMirrorNode => {
  const json = blocksToTiptap([block])
  const node = editor.schema.nodeFromJSON(json.content![0])
  return node
}

const applyRemove = (editor: Editor, id: string): boolean => {
  const found = findNodeByBlockId(editor, id)
  if (!found) return false

  const { pos, node } = found
  editor.chain().deleteRange({ from: pos, to: pos + node.nodeSize }).run()
  return true
}

const applyAdd = (editor: Editor, block: Block, afterId: string | null): boolean => {
  if (block.id) {
    const existing = findNodeByBlockId(editor, block.id)
    if (existing) {
      const newNode = blockToNode(editor, block)
      if (JSON.stringify(existing.node.toJSON()) === JSON.stringify(newNode.toJSON())) {
        return false // same content, skip
      }
      // different content, replace
      return applyReplace(editor, block)
    }
  }

  const node = blockToNode(editor, block)

  if (afterId === null) {
    editor.chain().insertContentAt(0, node.toJSON()).run()
    return true
  }

  const found = findNodeByBlockId(editor, afterId)
  if (!found) return false

  const insertPos = found.pos + found.node.nodeSize
  editor.chain().insertContentAt(insertPos, node.toJSON()).run()
  return true
}

const applyReplace = (editor: Editor, block: Block): boolean => {
  const found = findNodeByBlockId(editor, block.id!)
  if (!found) return false

  const { pos, node: oldNode } = found
  const newNode = blockToNode(editor, block)

  editor
    .chain()
    .deleteRange({ from: pos, to: pos + oldNode.nodeSize })
    .insertContentAt(pos, newNode.toJSON())
    .run()
  return true
}

export const applyBlockOps = (editor: Editor, ops: BlockOp[]): void => {
  if (ops.length === 0) return

  const removes = ops.filter((op): op is BlockOp & { type: "remove" } => op.type === "remove")
  const replaces = ops.filter((op): op is BlockOp & { type: "replace" } => op.type === "replace")
  const adds = ops.filter((op): op is BlockOp & { type: "add" } => op.type === "add")

  removes.forEach((op) => applyRemove(editor, op.id))
  replaces.forEach((op) => applyReplace(editor, op.block))
  adds.forEach((op) => applyAdd(editor, op.block, op.afterId))
}
