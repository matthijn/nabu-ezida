import { useCreateBlockNote } from "@blocknote/react"
import { BlockNoteView } from "@blocknote/shadcn"
import "@blocknote/shadcn/style.css"
import { useTheme } from "~/hooks/use-theme"
import { schema, type CustomEditor } from "~/components/editor/blocks"
import type { StoredAnnotation } from "~/domain/annotations"
import { useAnnotations } from "~/components/editor/annotations"

const sampleAnnotations: StoredAnnotation[] = [
  {
    id: "1",
    text: "Today I conducted three interviews with participants from the target demographic. The sessions revealed interesting patterns in how users approach the onboarding flow.",
    codeIds: ["theme-identity"],
  },
  {
    id: "2",
    text: "The sessions revealed interesting patterns in how users approach the onboarding flow.",
    codeIds: ["method-interview"],
  },
]

const initialContent = [
  {
    type: "heading" as const,
    props: { level: 1 as const },
    content: "Research Notes: User Interviews",
  },
  {
    type: "paragraph" as const,
    content: "Today I conducted three interviews with participants from the target demographic. The sessions revealed interesting patterns in how users approach the onboarding flow.",
  },
  {
    type: "heading" as const,
    props: { level: 2 as const },
    content: "Key Findings",
  },
  {
    type: "paragraph" as const,
    content: "Users consistently mentioned feeling overwhelmed by the number of options presented. Several participants suggested a more guided approach would help.",
  },
  {
    type: "bulletListItem" as const,
    content: "Navigation confusion was common in first-time users",
  },
  {
    type: "bulletListItem" as const,
    content: "Most preferred dark mode by default",
  },
  {
    type: "bulletListItem" as const,
    content: "Mobile experience needs improvement",
  },
  {
    type: "paragraph" as const,
    content: "",
  },
]

const isAtTrigger = (editor: CustomEditor): boolean => {
  const cursor = editor.getTextCursorPosition()
  const block = cursor.block

  if (block.type !== "paragraph") return false

  const content = block.content
  if (!Array.isArray(content)) return false
  if (content.length !== 1) return false

  const first = content[0]
  if (first.type !== "text") return false
  if (first.text !== "@") return false

  return true
}

const convertToNabuQuestion = (editor: CustomEditor): void => {
  const cursor = editor.getTextCursorPosition()
  editor.updateBlock(cursor.block, { type: "nabuQuestion" })
  editor.setTextCursorPosition(cursor.block)
}

const checkForAtTrigger = (editor: CustomEditor): void => {
  if (isAtTrigger(editor)) {
    convertToNabuQuestion(editor)
  }
}

export const Editor = () => {
  const editor = useCreateBlockNote({
    schema,
    initialContent,
    placeholders: {
      default: "Start typing or ask Nabu with @",
    },
  })
  const { theme } = useTheme()

  useAnnotations(editor, sampleAnnotations)

  const handleChange = () => checkForAtTrigger(editor)

  return (
    <BlockNoteView
      editor={editor}
      theme={theme}
      className="h-full"
      slashMenu={false}
      onChange={handleChange}
    />
  )
}
