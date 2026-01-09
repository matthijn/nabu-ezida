export type { CommonBlockProps } from "./common"
export type { TextBlockType, HeadingProps } from "./text"
export type { ListBlockType, CheckListProps } from "./list"
export type { MediaBlockType, MediaProps } from "./media"
export type { CodeBlockType, CodeProps } from "./code"
export type { TableBlockType } from "./table"
export type { NabuBlockType, NabuQuestionProps } from "./nabu"

import type { CommonBlockProps } from "./common"
import type { TextBlockType, HeadingProps } from "./text"
import type { ListBlockType, CheckListProps } from "./list"
import type { MediaBlockType, MediaProps } from "./media"
import type { CodeBlockType, CodeProps } from "./code"
import type { TableBlockType } from "./table"
import type { NabuBlockType, NabuQuestionProps } from "./nabu"

export type BlockType =
  | TextBlockType
  | ListBlockType
  | MediaBlockType
  | CodeBlockType
  | TableBlockType
  | NabuBlockType

export type BlockProps = CommonBlockProps &
  HeadingProps &
  CheckListProps &
  MediaProps &
  CodeProps &
  NabuQuestionProps
