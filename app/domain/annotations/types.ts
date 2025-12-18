export type StoredAnnotation = {
  id: string
  text: string
  codeIds: string[]
}

export type ResolvedAnnotation = {
  id: string
  from: number
  to: number
  codeIds: string[]
}

export type OverlapSegment = {
  from: number
  to: number
  codeIds: string[]
}
