export interface Annotation {
  id?: string
  text: string
  color: string
  reason?: string
  code?: string
  actor?: "ai" | "user"
  review?: string
}

export interface ResolvedAnnotation {
  id?: string
  index: number
  from: number
  to: number
  color: string
  hasReview?: boolean
}

export interface OverlapSegment {
  from: number
  to: number
  colors: string[]
}
