export type Annotation<TPayload = unknown> = {
  id: string
  text: string
  actor: string
  color: string
  reason?: string
  payload?: TPayload
}

export type ResolvedAnnotation = {
  id: string
  from: number
  to: number
  color: string
}

export type OverlapSegment = {
  from: number
  to: number
  colors: string[]
  ids: string[]
}
