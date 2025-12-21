import type { Annotation } from "~/domain/document/annotations"
import type { CodingPayload } from "./types"

export const getCodingPayload = (annotation: Annotation<unknown>): CodingPayload | undefined => {
  const payload = annotation.payload as CodingPayload | undefined
  return payload?.type === "coding" ? payload : undefined
}

export const getCodeId = (annotation: Annotation<unknown>): string | null =>
  getCodingPayload(annotation)?.code_id ?? null
