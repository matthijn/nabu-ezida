export type { Document, DocumentData, Tag } from "./types"
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
