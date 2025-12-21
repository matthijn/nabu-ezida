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

export const resolveTextAnnotations = <T>(
  fullText: string,
  annotations: Annotation<T>[]
): ResolvedAnnotation[] =>
  annotations
    .map(a => {
      const pos = findTextPosition(fullText, a.text)
      if (!pos) return null
      return {
        id: a.id,
        from: pos.from,
        to: pos.to,
        color: a.color,
      }
    })
    .filter((a): a is ResolvedAnnotation => a !== null)
