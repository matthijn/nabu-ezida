"use client"

import { useEditor, EditorContent, type JSONContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
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

export type EditorProps = {
  content?: JSONContent
  placeholder?: string
  editable?: boolean
  onUpdate?: (content: JSONContent) => void
}

const defaultContent: JSONContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "Welcome to Nabu" }],
    },
    {
      type: "paragraph",
      attrs: { lockedBy: "alice" },
      content: [
        { type: "text", text: "This is a paragraph with some " },
        { type: "text", marks: [{ type: "bold" }], text: "bold" },
        { type: "text", text: " and " },
        { type: "text", marks: [{ type: "italic" }], text: "italic" },
        { type: "text", text: " text. Here is a " },
        { type: "text", marks: [{ type: "link", attrs: { href: "https://example.com" } }], text: "link" },
        { type: "text", text: " and a mention: " },
        { type: "mention", attrs: { id: "1", label: "Research Team" } },
        { type: "text", text: "." },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Task List" }],
    },
    {
      type: "taskList",
      content: [
        {
          type: "taskItem",
          attrs: { checked: true },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Set up editor" }] }],
        },
        {
          type: "taskItem",
          attrs: { checked: true },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Add extensions" }] }],
        },
        {
          type: "taskItem",
          attrs: { checked: false },
          content: [{ type: "paragraph", content: [{ type: "text", text: "Build research features" }] }],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Data Table" }],
    },
    {
      type: "table",
      attrs: { lockedBy: "charlie" },
      content: [
        {
          type: "tableRow",
          content: [
            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Participant" }] }] },
            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Theme" }] }] },
            { type: "tableHeader", content: [{ type: "paragraph", content: [{ type: "text", text: "Count" }] }] },
          ],
        },
        {
          type: "tableRow",
          content: [
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "P01" }] }] },
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Habitat loss" }] }] },
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "12" }] }] },
          ],
        },
        {
          type: "tableRow",
          content: [
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "P02" }] }] },
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "Climate change" }] }] },
            { type: "tableCell", content: [{ type: "paragraph", content: [{ type: "text", text: "8" }] }] },
          ],
        },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Image" }],
    },
    {
      type: "image",
      attrs: { src: "https://placehold.co/600x200/f5f5f4/a8a29e?text=Research+Image", alt: "Placeholder image" },
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Block Quote" }],
    },
    {
      type: "blockquote",
      attrs: { lockedBy: "bob" },
      content: [
        { type: "paragraph", content: [{ type: "text", text: "The participants expressed concern about long-term environmental impacts." }] },
      ],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Code Block" }],
    },
    {
      type: "codeBlock",
      content: [{ type: "text", text: "const themes = extractThemes(interviews)\nconst frequency = countByTheme(themes)" }],
    },
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Conversation" }],
    },
    {
      type: "nabuQuestion",
      attrs: {
        initiator: { id: "user-1", type: "human", name: "You", description: "", variant: "brand", initial: "M" },
        recipient: { id: "nabu", type: "llm", name: "Nabu", description: "AI research assistant", variant: "brand", initial: "N" },
        messages: [],
        draft: "",
      },
    },
  ],
}

export const Editor = ({
  content = defaultContent,
  placeholder = "Start typing...",
  editable = true,
  onUpdate,
}: EditorProps) => {
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
    content,
    editable,
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getJSON())
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[200px] px-4 py-2",
      },
    },
  })

  return <EditorContent editor={editor} />
}
