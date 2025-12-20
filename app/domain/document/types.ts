import type { Annotation } from "../annotations"

export type BlockType =
  | "paragraph"
  | "heading"
  | "bulletListItem"
  | "numberedListItem"
  | "checkListItem"
  | "table"
  | "image"
  | "video"
  | "audio"
  | "file"
  | "codeBlock"

export type InlineType = "text" | "link"

export type Styles = {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strikethrough?: boolean
  code?: boolean
  text_color?: string
  background_color?: string
}

export type StyledText = {
  type: InlineType
  text: string
  styles?: Styles
}

export type InlineContent = {
  type: InlineType
  text?: string
  styles?: Styles
  href?: string
  content?: StyledText[]
}

export type BlockProps = {
  level?: number
  background_color?: string
  text_color?: string
  text_alignment?: string
  checked?: boolean
  language?: string
  url?: string
  caption?: string
  width?: number
}

export type Block = {
  id: string
  type: BlockType
  props?: BlockProps
  content?: InlineContent[]
  children?: Block[]
}

export type DocumentData = {
  project_id: string
  name: string
  description: string
  title?: string
  time?: string
  original: string
  pinned: boolean
  content: Block[]
  annotations: Annotation[]
}

export type Document = {
  id: string
  healthy: boolean
  version: number
} & DocumentData
