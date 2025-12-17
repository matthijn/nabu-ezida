import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";

export function Editor() {
  const editor = useCreateBlockNote();

  return <BlockNoteView editor={editor} theme="dark" />;
}
