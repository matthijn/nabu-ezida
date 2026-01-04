"use client"

import { useEffect, useRef } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { TableRow } from "@tiptap/extension-table-row"
import { TableCell } from "@tiptap/extension-table-cell"
import { TableHeader } from "@tiptap/extension-table-header"
import { TaskItem } from "@tiptap/extension-task-item"
import { Link } from "@tiptap/extension-link"
import { Mention } from "@tiptap/extension-mention"
import { Markdown } from "tiptap-markdown"
import { DragHandle } from "@tiptap/extension-drag-handle-react"
import { FeatherGripVertical } from "@subframe/core"
import { Lock, BlockID, mentionSuggestion, applyBlockOps } from "./extensions"
import {
  Paragraph,
  Heading,
  Blockquote,
  CodeBlock,
  BulletList,
  OrderedList,
  Table,
  TaskList,
  Image,
  NabuQuestion,
} from "./nodes"
import type { Block } from "~/domain/document"
import { blocksToTiptap, tiptapToBlocks, diffBlocks } from "~/domain/document"

export type EditorProps = {
  content?: Block[]
  placeholder?: string
  editable?: boolean
  onUpdate?: (blocks: Block[]) => void
  onMoveBlock?: (blockId: string, targetPosition: string) => void
}

export const Editor = ({
  content,
  placeholder = "Start typing...",
  editable = true,
  onUpdate,
  onMoveBlock,
}: EditorProps) => {
  const initialContent = useRef(content)
  const prevContent = useRef(content)
  const isFirstRender = useRef(true)
  const draggedBlockId = useRef<string | null>(null)
  const draggedFromPos = useRef<number | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: false,
        heading: false,
        blockquote: false,
        codeBlock: false,
        bulletList: false,
        orderedList: false,
      }),
      Paragraph,
      Heading,
      Blockquote,
      CodeBlock,
      BulletList,
      OrderedList,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Image,
      TaskList,
      TaskItem.configure({ nested: true }),
      NabuQuestion,
      Link.configure({ openOnClick: false }),
      Mention.configure({
        HTMLAttributes: { class: "mention" },
        suggestion: mentionSuggestion,
      }),
      Markdown,
      BlockID,
      Lock,
    ],
    content: blocksToTiptap(initialContent.current ?? []),
    editable,
    onUpdate: ({ editor }) => {
      onUpdate?.(tiptapToBlocks(editor.getJSON()))
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[200px] px-4 py-2",
      },
    },
  })

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (!editor) return

    const oldBlocks = prevContent.current ?? []
    const newBlocks = content ?? []
    const ops = diffBlocks(oldBlocks, newBlocks)

    if (ops.length > 0) {
      applyBlockOps(editor, ops)
    }

    prevContent.current = content
  }, [editor, content])

  const hoveredBlockId = useRef<string | null>(null)

  const handleNodeChange = (data: { node: { attrs: { blockId?: string } } | null }) => {
    hoveredBlockId.current = data.node?.attrs.blockId ?? null
  }

  const handleDragStart = () => {
    draggedBlockId.current = hoveredBlockId.current
  }

  const handleDragEnd = () => {
    if (!draggedBlockId.current || !editor || !onMoveBlock) {
      draggedBlockId.current = null
      return
    }

    // Find the new position by looking at what's before the dragged block
    const blocks = tiptapToBlocks(editor.getJSON())
    const draggedId = draggedBlockId.current

    const findPosition = (blocks: Block[], parentId?: string): string | null => {
      for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].id === draggedId) {
          if (i === 0) {
            return parentId ? `head:${parentId}` : "head"
          }
          return blocks[i - 1].id!
        }
        if (blocks[i].children) {
          const found = findPosition(blocks[i].children!, blocks[i].id!)
          if (found) return found
        }
      }
      return null
    }

    const position = findPosition(blocks)
    if (position) {
      onMoveBlock(draggedId, position)
    }

    draggedBlockId.current = null
  }

  return (
    <div className="relative w-full">
      <DragHandle
        editor={editor}
        onNodeChange={handleNodeChange}
        onElementDragStart={handleDragStart}
        onElementDragEnd={handleDragEnd}
      >
        <div className="flex items-center justify-center w-6 h-6 cursor-grab active:cursor-grabbing rounded hover:bg-neutral-100">
          <FeatherGripVertical className="w-4 h-4 text-neutral-400" />
        </div>
      </DragHandle>
      <EditorContent editor={editor} className="w-full" />
    </div>
  )
}
