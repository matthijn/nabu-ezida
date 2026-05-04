import type { Annotation } from "~/domain/data-blocks/attributes/schema"

const annotationToProse = (a: Annotation): string => [a.text, a.reason].join("\n")

export const annotationsToProse = (block: unknown): string | null => {
  const { annotations } = block as { annotations: Annotation[] }
  if (!annotations || annotations.length === 0) return null
  return annotations.map(annotationToProse).join("\n\n")
}
