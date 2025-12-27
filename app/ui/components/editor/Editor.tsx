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
import { Lock, BlockID, mentionSuggestion } from "./extensions"
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
import { blocksToTiptap, tiptapToBlocks } from "~/domain/document"

export type EditorProps = {
  content?: Block[]
  placeholder?: string
  editable?: boolean
  onUpdate?: (blocks: Block[]) => void
}

export const Editor = ({
  content,
  placeholder = "Start typing...",
  editable = true,
  onUpdate,
}: EditorProps) => {
  const initialContent = useRef(content)
  const isFirstRender = useRef(true)

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

  // Handle content updates after initial mount (e.g., from WebSocket)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (editor) {
      editor.commands.setContent(blocksToTiptap(content ?? []))
    }
  }, [editor, content])

  return <EditorContent editor={editor} className="w-full" />
}
