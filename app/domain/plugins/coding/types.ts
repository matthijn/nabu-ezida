import type { Annotation } from "~/domain/document/annotations"

export type Confidence = "high" | "medium" | "low"

export type CodingPayload = {
  type: "coding"
  code_id: string
  confidence: Confidence
}

export type CodingAnnotation = Annotation<CodingPayload>

export type Code = {
  id: string
  healthy: boolean
  version: number
  project_id: string
  slug: string
  pinned: boolean
  color: string
  definition: string
  inclusion_criteria?: string
  exclusion_criteria?: string
  examples?: string[]
  counter_examples?: string[]
}
