import type { StoredAnnotation } from "./types"

export type TextPosition = { from: number; to: number }

export type TextAnnotation = {
  id: string
  from: number
  to: number
  codeIds: string[]
}

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
  annotations: StoredAnnotation[]
): TextAnnotation[] =>
  annotations
    .map(a => {
      const pos = findTextPosition(fullText, a.text)
      if (!pos) return null
      return { id: a.id, from: pos.from, to: pos.to, codeIds: a.codeIds }
    })
    .filter((a): a is TextAnnotation => a !== null)
