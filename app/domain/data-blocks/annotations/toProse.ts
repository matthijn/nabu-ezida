import type { Annotation } from "~/domain/data-blocks/attributes/schema"

const annotationToProse = (a: Annotation): string => {
  const parts = [a.text, a.reason]
  if (a.review) parts.push(`Review: ${a.review}`)
  return parts.join("\n")
}

export const annotationsToProse = (block: unknown): string | null => {
  if (!Array.isArray(block) || block.length === 0) return null
  return block.map(annotationToProse).join("\n\n")
}
