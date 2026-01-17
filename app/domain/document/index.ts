export type { Document, DocumentData, Tag } from "./types"
export type {
  Block,
  InlineContent,
  InlineType,
  StyledText,
  Styles,
} from "./block"
export type {
  BlockType,
  BlockProps,
  CommonBlockProps,
  TextBlockType,
  HeadingProps,
  ListBlockType,
  CheckListProps,
  MediaBlockType,
  MediaProps,
  CodeBlockType,
  CodeProps,
  TableBlockType,
} from "./blocks"
export type {
  Annotation,
  ResolvedAnnotation,
  OverlapSegment,
  TextPosition,
} from "./annotations"
export {
  findTextPosition,
  resolveTextAnnotations,
  segmentByOverlap,
  createBarberPoleGradient,
  createBackground,
} from "./annotations"
export { blocksToTiptap, tiptapToBlocks } from "./convert/index"
export {
  diffBlocks,
  hasSignificantChange,
  hasSignificantDrift,
  computeBlockFingerprint,
  type BlockOp,
  type BlockFingerprint,
} from "./diff"
export { blocksToArray, blocksToArrayWithChildren, getChildBlocks, type BlockTree } from "./selectors"
export { blocksToMarkdown } from "./markdown"
