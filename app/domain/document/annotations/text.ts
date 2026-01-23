import type { Annotation, ResolvedAnnotation } from "./types"

export type TextPosition = { from: number; to: number }

export const findTextPosition = (
  fullText: string,
  searchText: string
): TextPosition | null => {
  const index = fullText.indexOf(searchText)
  if (index === -1) return null
  return { from: index, to: index + searchText.length }
}

export const resolveTextAnnotations = (
  fullText: string,
  annotations: Annotation[]
): ResolvedAnnotation[] =>
  annotations
    .map((a, i) => {
      const pos = findTextPosition(fullText, a.text)
      if (!pos) return null
      return {
        index: i,
        from: pos.from,
        to: pos.to,
        color: a.color,
      }
    })
    .filter((a): a is ResolvedAnnotation => a !== null)
