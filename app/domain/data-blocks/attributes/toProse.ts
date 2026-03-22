import type { DocumentMeta, Annotation } from "./schema"

const annotationToProse = (a: Annotation): string => {
  const parts = [a.text, a.reason]
  if (a.review) parts.push(`Review: ${a.review}`)
  return parts.join("\n")
}

export const attributesToProse = (block: unknown): string | null => {
  const meta = block as Partial<DocumentMeta>
  const annotations = meta.annotations
  if (!annotations || annotations.length === 0) return null
  return annotations.map(annotationToProse).join("\n\n")
}
