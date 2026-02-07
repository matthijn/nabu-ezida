export type Annotation = {
  id?: string
  text: string
  color: string
  reason?: string
  code?: string
  pending?: "pending_change" | "pending_deletion"
}

export type ResolvedAnnotation = {
  id?: string
  index: number
  from: number
  to: number
  color: string
}

export type OverlapSegment = {
  from: number
  to: number
  colors: string[]
}
