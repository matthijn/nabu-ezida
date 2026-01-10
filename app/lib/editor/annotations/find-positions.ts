import { EditorState } from "@tiptap/pm/state"
import { SearchQuery } from "prosemirror-search"
import type { Annotation, ResolvedAnnotation } from "~/domain/document/annotations"

type TextPosition = { from: number; to: number }

const findAllPositions = (state: EditorState, text: string): TextPosition[] => {
  const query = new SearchQuery({ search: text, caseSensitive: true })
  if (!query.valid) return []

  const positions: TextPosition[] = []
  let result = query.findNext(state, 0)

  while (result) {
    positions.push({ from: result.from, to: result.to })
    result = query.findNext(state, result.to)
  }

  return positions
}

export const resolveAnnotationsInDoc = <T>(
  state: EditorState,
  annotations: Annotation<T>[]
): ResolvedAnnotation[] => {
  const resolved: ResolvedAnnotation[] = []

  for (const annotation of annotations) {
    const positions = findAllPositions(state, annotation.text)

    if (positions.length === 0) {
      console.warn(`[Annotations] Text not found: "${annotation.text.slice(0, 50)}..."`)
      continue
    }

    for (const pos of positions) {
      resolved.push({
        id: annotation.id ?? crypto.randomUUID(),
        from: pos.from,
        to: pos.to,
        color: annotation.color,
      })
    }
  }

  return resolved
}
