import { Plugin, PluginKey } from "prosemirror-state"
import { DecorationSet } from "prosemirror-view"
import type { Node } from "prosemirror-model"
import type { Annotation, ResolvedAnnotation } from "~/domain/document/annotations"
import { segmentByOverlap } from "~/domain/document/annotations"
import { createDecorationSet } from "./decorations"

const pluginKey = new PluginKey("annotations")

type TextRange = { from: number; to: number }

const textOffsetToPos = (doc: Node, offset: number): number => {
  let result = 0
  let textSeen = 0
  let found = false

  doc.descendants((node, nodePos) => {
    if (found || textSeen > offset) return false
    if (node.isText) {
      const len = node.text?.length ?? 0
      if (textSeen + len >= offset) {
        result = nodePos + (offset - textSeen)
        found = true
        return false
      }
      textSeen += len
    }
    return true
  })

  return result
}

const findTextRange = (doc: Node, searchText: string): TextRange | null => {
  const docText = doc.textContent
  const offset = docText.indexOf(searchText)
  if (offset === -1) return null

  const from = textOffsetToPos(doc, offset)
  const to = textOffsetToPos(doc, offset + searchText.length)
  return { from, to }
}

const resolveAnnotations = (doc: Node, annotations: Annotation[]): ResolvedAnnotation[] =>
  annotations
    .map((a, i) => {
      const range = findTextRange(doc, a.text)
      if (!range) return null
      return { index: i, from: range.from, to: range.to, color: a.color }
    })
    .filter((a): a is ResolvedAnnotation => a !== null)

type PluginState = {
  annotations: Annotation[]
  decorations: DecorationSet
}

const computeDecorations = (doc: Node, annotations: Annotation[]): DecorationSet => {
  const resolved = resolveAnnotations(doc, annotations)
  const segments = segmentByOverlap(resolved)
  return createDecorationSet(doc, segments)
}

export const createAnnotationsPlugin = (annotations: Annotation[]): Plugin =>
  new Plugin({
    key: pluginKey,
    state: {
      init: (_, state) => ({
        annotations,
        decorations: computeDecorations(state.doc, annotations),
      }),
      apply: (tr, pluginState, _oldState, newState) => {
        if (!tr.docChanged) return pluginState
        return {
          annotations: pluginState.annotations,
          decorations: computeDecorations(newState.doc, pluginState.annotations),
        }
      },
    },
    props: {
      decorations: (state) => {
        const ps = pluginKey.getState(state) as PluginState | undefined
        return ps?.decorations ?? DecorationSet.empty
      },
    },
  })
