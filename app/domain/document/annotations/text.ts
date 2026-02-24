import type { Annotation, ResolvedAnnotation } from "./types"

export type TextPosition = { from: number; to: number }

export const findAllTextPositions = (
  fullText: string,
  searchText: string
): TextPosition[] => {
  if (searchText.length === 0) return []
  const positions: TextPosition[] = []
  let start = 0
  while (true) {
    const index = fullText.indexOf(searchText, start)
    if (index === -1) return positions
    positions.push({ from: index, to: index + searchText.length })
    start = index + 1
  }
}

export const findTextPosition = (
  fullText: string,
  searchText: string
): TextPosition | null => {
  const all = findAllTextPositions(fullText, searchText)
  return all.length > 0 ? all[0] : null
}

export const resolveTextAnnotations = (
  fullText: string,
  annotations: Annotation[]
): ResolvedAnnotation[] => {
  let index = 0
  return annotations.flatMap((a) =>
    findAllTextPositions(fullText, a.text).map((pos) => ({
      index: index++,
      from: pos.from,
      to: pos.to,
      color: a.color,
    }))
  )
}
