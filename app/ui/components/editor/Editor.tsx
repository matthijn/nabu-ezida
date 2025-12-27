"use client"

import { useMemo } from "react"
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

const defaultContent: Block[] = [
  {
    id: "h1",
    type: "heading",
    props: { level: 1 },
    content: [{ type: "text", text: "Welcome to Nabu" }],
  },
  {
    id: "p1",
    type: "paragraph",
    content: [
      { type: "text", text: "This is a paragraph with some " },
      { type: "text", text: "bold", styles: { bold: true } },
      { type: "text", text: " and " },
      { type: "text", text: "italic", styles: { italic: true } },
      { type: "text", text: " text. Here is a " },
      { type: "link", text: "link", href: "https://example.com" },
      { type: "text", text: "." },
    ],
  },
  {
    id: "h2-tasks",
    type: "heading",
    props: { level: 2 },
    content: [{ type: "text", text: "Task List" }],
  },
  {
    id: "task1",
    type: "checkListItem",
    props: { checked: true },
    content: [{ type: "text", text: "Set up editor" }],
  },
  {
    id: "task2",
    type: "checkListItem",
    props: { checked: true },
    content: [{ type: "text", text: "Add extensions" }],
  },
  {
    id: "task3",
    type: "checkListItem",
    props: { checked: false },
    content: [{ type: "text", text: "Build research features" }],
  },
  {
    id: "h2-image",
    type: "heading",
    props: { level: 2 },
    content: [{ type: "text", text: "Image" }],
  },
  {
    id: "img1",
    type: "image",
    props: {
      url: "https://placehold.co/600x200/f5f5f4/a8a29e?text=Research+Image",
      caption: "Placeholder image",
    },
  },
  {
    id: "h2-quote",
    type: "heading",
    props: { level: 2 },
    content: [{ type: "text", text: "Block Quote" }],
  },
  {
    id: "quote1",
    type: "quote",
    content: [{ type: "text", text: "The participants expressed concern about long-term environmental impacts." }],
  },
  {
    id: "h2-code",
    type: "heading",
    props: { level: 2 },
    content: [{ type: "text", text: "Code Block" }],
  },
  {
    id: "code1",
    type: "codeBlock",
    props: { language: "typescript" },
    content: [{ type: "text", text: "const themes = extractThemes(interviews)\nconst frequency = countByTheme(themes)" }],
  },
]

export const Editor = ({
  content = defaultContent,
  placeholder = "Start typing...",
  editable = true,
  onUpdate,
}: EditorProps) => {
  const tiptapContent = useMemo(() => blocksToTiptap(content), [content])

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
    content: tiptapContent,
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

  return <EditorContent editor={editor} className="w-full" />
}
