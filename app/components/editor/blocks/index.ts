import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core"
import { nabuQuestionSpec } from "./nabuQuestion"

export const blockSpecs = {
  ...defaultBlockSpecs,
  nabuQuestion: nabuQuestionSpec(),
}

export const schema = BlockNoteSchema.create({
  blockSpecs,
})

export type EditorSchema = typeof schema
export type CustomEditor = typeof schema.BlockNoteEditor
