import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core"
import { nabuQuestionSpec } from "./nabuQuestion"

/**
 * Default BlockNote blocks (reference):
 * - paragraph
 * - heading
 * - quote (blockquote)
 * - bulletListItem
 * - numberedListItem
 * - checkListItem
 * - codeBlock
 * - table
 * - file
 * - image
 * - video
 * - audio
 */

/**
 * Custom blocks for Nabu
 */
const customBlockSpecs = {
  nabuQuestion: nabuQuestionSpec(),
  // Add more custom blocks here:
  // nabuSuggestion: nabuSuggestionSpec(),
  // lockedBlock: lockedBlockSpec(),
}

/**
 * All block specs - defaults + custom
 */
export const blockSpecs = {
  ...defaultBlockSpecs,
  ...customBlockSpecs,
}

export const schema = BlockNoteSchema.create({
  blockSpecs,
})

export type EditorSchema = typeof schema
export type CustomEditor = typeof schema.BlockNoteEditor
