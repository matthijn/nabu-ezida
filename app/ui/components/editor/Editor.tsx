"use client"

import { useEffect, useRef, useCallback } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { TableRow } from "@tiptap/extension-table-row"
import { TableCell } from "@tiptap/extension-table-cell"
import { TableHeader } from "@tiptap/extension-table-header"
import { TaskItem } from "@tiptap/extension-task-item"
import { Markdown } from "tiptap-markdown"
import { Lock, BlockID, applyBlockOps, Annotations } from "./extensions"
import { AnnotationHover } from "./AnnotationHover"
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
import type { BlockOp } from "~/domain/document"

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
  const lastSyncedBlocks = useRef<Block[]>(content ?? [])
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  return (
    <AnnotationHover annotations={annotations}>
      <EditorContent editor={editor} className="w-full" />
    </AnnotationHover>
  )
}
