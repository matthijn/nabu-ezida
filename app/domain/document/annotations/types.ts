export type Annotation = {
  text: string
  color: string
  reason?: string
  code?: string
}

export type ResolvedAnnotation = {
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
