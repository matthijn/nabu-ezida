"use client"

import { useEffect, useRef, useCallback } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { TableRow } from "@tiptap/extension-table-row"
import { TableCell } from "@tiptap/extension-table-cell"
import { TableHeader } from "@tiptap/extension-table-header"
import { TaskItem } from "@tiptap/extension-task-item"
import { Markdown } from "tiptap-markdown"
import { DragHandle } from "@tiptap/extension-drag-handle-react"
import { FeatherSparkles } from "@subframe/core"
import { Lock, BlockID, applyBlockOps, Annotations } from "./extensions"
import { AnnotationHover } from "./AnnotationHover"
import { useEditorDocument } from "./context"
import { useNabu } from "~/ui/components/nabu/context"
import type { Annotation } from "~/domain/document/annotations"
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
} from "./nodes"
import type { Block } from "~/domain/document"
import { blocksToTiptap, tiptapToBlocks, diffBlocks } from "~/domain/document"
import type { BlockContext } from "~/lib/chat/store"

import type { BlockOp } from "~/domain/document"

const findBlockById = (blocks: Block[], id: string): Block | null => {
  for (const block of blocks) {
    if (block.id === id) return block
    if (block.children) {
      const found = findBlockById(block.children, id)
      if (found) return found
    }
  }
  return null
}

const extractText = (content: Block["content"]): string => {
  if (!content) return ""
  return content.map((c) => c.text ?? "").join("")
}

const toBlockContext = (block: Block): BlockContext => ({
  id: block.id!,
  type: block.type,
  textContent: extractText(block.content),
})

export type EditorProps = {
  content?: Block[]
  annotations?: Annotation[]
  placeholder?: string
  editable?: boolean
  onUpdate?: (blocks: Block[]) => void
  onMoveBlock?: (blockId: string, targetPosition: string) => void
  onSyncBlocks?: (ops: BlockOp[]) => void
}

export const Editor = ({
  content,
  annotations = [],
  placeholder = "Start typing...",
  editable = true,
  onUpdate,
  onMoveBlock,
  onSyncBlocks,
}: EditorProps) => {
  const initialContent = useRef(content)
  const prevContent = useRef(content)
  const isFirstRender = useRef(true)
  const draggedBlockId = useRef<string | null>(null)
  const lastSyncedBlocks = useRef<Block[]>(content ?? [])
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoveredBlockId = useRef<string | null>(null)

  const editorDocument = useEditorDocument()
  const { startChat, updateContext } = useNabu()

  const syncBlocks = useCallback((editor: ReturnType<typeof useEditor>) => {
    if (!editor || !onSyncBlocks) return
    const currentBlocks = tiptapToBlocks(editor.getJSON())
    const ops = diffBlocks(lastSyncedBlocks.current, currentBlocks)
    if (ops.length > 0) {
      onSyncBlocks(ops)
      lastSyncedBlocks.current = currentBlocks
    }
  }, [onSyncBlocks])

  const debouncedSync = useCallback((editor: ReturnType<typeof useEditor>) => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current)
    }
    syncTimeoutRef.current = setTimeout(() => {
      syncBlocks(editor)
    }, 1000)
  }, [syncBlocks])

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
      Markdown,
      BlockID,
      Lock,
      Annotations.configure({ annotations }),
    ],
    content: blocksToTiptap(initialContent.current ?? []),
    editable,
    onUpdate: ({ editor }) => {
      onUpdate?.(tiptapToBlocks(editor.getJSON()))
      debouncedSync(editor)
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[200px] px-4 py-2",
      },
    },
  })

  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [])

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

  const handleNodeChange = (data: { node: { attrs: { blockId?: string } } | null }) => {
    const blockId = data.node?.attrs.blockId ?? null
    hoveredBlockId.current = blockId

    if (!editorDocument) return

    const block = blockId && content ? findBlockById(content, blockId) : null
    updateContext({
      documentId: editorDocument.documentId,
      documentName: editorDocument.documentName,
      block: block ? toBlockContext(block) : null,
    })
  }

  const handleDragStart = () => {
    draggedBlockId.current = hoveredBlockId.current
  }

  const handleDragEnd = () => {
    if (!draggedBlockId.current || !editor || !onMoveBlock) {
      draggedBlockId.current = null
      return
    }

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

  const handleNabuClick = () => {
    startChat()
  }

  return (
    <div className="relative w-full">
      <DragHandle
        editor={editor}
        onNodeChange={handleNodeChange}
        onElementDragStart={handleDragStart}
        onElementDragEnd={handleDragEnd}
      >
        <div
          onClick={handleNabuClick}
          className="flex items-center justify-center w-6 h-6 cursor-pointer rounded hover:bg-brand-50 text-brand-600 opacity-50 hover:opacity-100 transition-opacity"
        >
          <FeatherSparkles className="w-4 h-4" />
        </div>
      </DragHandle>
      <AnnotationHover annotations={annotations}>
        <EditorContent editor={editor} className="w-full" />
      </AnnotationHover>
    </div>
  )
}
