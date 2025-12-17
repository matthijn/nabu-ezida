import type { PartialBlock } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import { useTheme } from "~/hooks/use-theme";

const initialContent: PartialBlock[] = [
  {
    type: "heading",
    props: { level: 1 },
    content: "Welcome to Nabu",
  },
  {
    type: "paragraph",
    content: "The last editor you'll ever need.",
  },
  {
    type: "heading",
    props: { level: 2 },
    content: "Getting Started",
  },
  {
    type: "paragraph",
    content: "Start typing to create your document. Use the slash command (/) to insert different block types.",
  },
  {
    type: "bulletListItem",
    content: "Rich text formatting with bold, italic, and more",
  },
  {
    type: "bulletListItem",
    content: "Headings, lists, and code blocks",
  },
  {
    type: "bulletListItem",
    content: "Dark and light mode support",
  },
  {
    type: "heading",
    props: { level: 2 },
    content: "Keyboard Shortcuts",
  },
  {
    type: "paragraph",
    content: [
      { type: "text", text: "Press ", styles: {} },
      { type: "text", text: "Cmd+B", styles: { bold: true } },
      { type: "text", text: " to toggle the sidebar.", styles: {} },
    ],
  },
];

export function Editor() {
  const editor = useCreateBlockNote({ initialContent });
  const { theme } = useTheme();

  return (
    <BlockNoteView
      editor={editor}
      theme={theme}
      className="h-full"
    />
  );
}
