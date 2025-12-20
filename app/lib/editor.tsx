import { useCreateBlockNote } from "@blocknote/react"
import { BlockNoteView } from "@blocknote/shadcn"
import "@blocknote/shadcn/style.css"
import { useTheme } from "~/hooks/use-theme"
import { schema, type CustomEditor } from "~/components/editor/blocks"
import { sampleAnnotations, initialContent } from "~/domain/annotations"
import { useAnnotations } from "~/components/editor/annotations"

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
      onChange={handleChange}
    />
  )
}
