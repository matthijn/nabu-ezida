"use client"

import { useEffect, useRef, useCallback } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { TableRow } from "@tiptap/extension-table-row"
import { TableCell } from "@tiptap/extension-table-cell"
import { TableHeader } from "@tiptap/extension-table-header"
import { TaskItem } from "@tiptap/extension-task-item"
import { Markdown } from "tiptap-markdown"
import { Lock, BlockID, applyBlockOps, Annotations, setAnnotations } from "./extensions"
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

export type CursorInfo = {
  blockId: string
  blockContent: string
} | null

export type EditorProps = {
  content?: Block[]
  annotations?: Annotation[]
  placeholder?: string
  editable?: boolean
  onUpdate?: (blocks: Block[]) => void
  onMoveBlock?: (blockId: string, targetPosition: string) => void
  onSyncBlocks?: (ops: BlockOp[]) => void
  cursorRef?: React.MutableRefObject<(() => CursorInfo) | null>
}

export const Editor = ({
  content,
  annotations = [],
  placeholder = "Start typing...",
  editable = true,
  onUpdate,
  onMoveBlock,
  onSyncBlocks,
  cursorRef,
}: EditorProps) => {
  const prevContent = useRef(content)
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
    content: blocksToTiptap(prevContent.current ?? []),
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
    if (!editor) return

    const oldBlocks = prevContent.current ?? []
    const newBlocks = content ?? []
    const ops = diffBlocks(oldBlocks, newBlocks)

    if (ops.length > 0) {
      applyBlockOps(editor, ops)
    }

    prevContent.current = content
  }, [editor, content])

  useEffect(() => {
    if (!editor) return
    const { tr } = editor.state
    tr.setMeta(setAnnotations(annotations).key, { annotations })
    editor.view.dispatch(tr)
  }, [editor, annotations])

  useEffect(() => {
    if (!cursorRef) return
    cursorRef.current = () => {
      if (!editor) return null
      const { from } = editor.state.selection
      const resolved = editor.state.doc.resolve(from)
      const blockNode = resolved.node(1)
      if (!blockNode) return null
      const blockId = blockNode.attrs.blockId as string | undefined
      if (!blockId) return null
      return { blockId, blockContent: blockNode.textContent }
    }
    return () => {
      if (cursorRef) cursorRef.current = null
    }
  }, [editor, cursorRef])

  return (
    <AnnotationHover annotations={annotations}>
      <EditorContent editor={editor} className="w-full" />
    </AnnotationHover>
  )
}
