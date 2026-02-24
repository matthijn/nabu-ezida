export type Annotation = {
  id?: string
  text: string
  color: string
  reason?: string
  code?: string
  actor?: "ai" | "user"
  review?: string
}

export type ResolvedAnnotation = {
  id?: string
  index: number
  from: number
  to: number
  color: string
  hasReview?: boolean
}

export type OverlapSegment = {
  from: number
  to: number
  colors: string[]
}
