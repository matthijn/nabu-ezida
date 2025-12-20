export type Confidence = "high" | "medium" | "low"

export type CodingPayload = {
  type: "coding"
  code_id: string
  confidence: Confidence
}

export type AnnotationPayload = CodingPayload

export type Annotation = {
  id: string
  text: string
  actor: string
  color: string
  reason?: string
  payload?: AnnotationPayload
}

export type ResolvedAnnotation = {
  id: string
  from: number
  to: number
  color: string
  code_id: string | null
}

export type OverlapSegment = {
  from: number
  to: number
  code_ids: string[]
}

export const getCodingPayload = (annotation: Annotation): CodingPayload | undefined =>
  annotation.payload?.type === "coding" ? annotation.payload : undefined

export const getCodeId = (annotation: Annotation): string | null =>
  getCodingPayload(annotation)?.code_id ?? null
