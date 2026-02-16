export type Annotation = {
  id?: string
  text: string
  color: string
  reason?: string
  code?: string
  actor?: "ai" | "user"
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
