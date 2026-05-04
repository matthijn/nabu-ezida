export interface ResolvedAnnotation {
  id?: string
  index: number
  from: number
  to: number
  color: string
}

export interface OverlapSegment {
  from: number
  to: number
  colors: string[]
}
