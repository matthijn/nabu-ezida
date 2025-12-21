import type { BlockType, BlockProps } from "./blocks"

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

export type Block = {
  id: string
  type: BlockType
  props?: BlockProps
  content?: InlineContent[]
  children?: Block[]
}
