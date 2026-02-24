import { Plugin, PluginKey } from "prosemirror-state"
import { DecorationSet } from "prosemirror-view"
import type { Node } from "prosemirror-model"
import type { Annotation, ResolvedAnnotation } from "~/domain/document/annotations"
import { segmentByOverlap } from "~/domain/document/annotations"
import { createDecorationSet, createMarkerDecorations, createReviewDecorations } from "./decorations"

const pluginKey = new PluginKey("annotations")

export const annotationsMeta = pluginKey

type TextRange = { from: number; to: number }

const isCodeBlock = (node: Node): boolean => node.type.name === "code_block"

export const proseTextContent = (doc: Node): string => {
  let text = ""
  doc.descendants((node) => {
    if (isCodeBlock(node)) return false
    if (node.isLeaf && node.textContent.length > 0) text += node.textContent
    return !node.isLeaf
  })
  return text
}

export const textOffsetToPos = (doc: Node, offset: number): number => {
  let result = 0
  let textSeen = 0
  let found = false
  let lastNodeEnd = 0

  doc.descendants((node, nodePos) => {
    if (found || textSeen > offset) return false
    if (isCodeBlock(node)) return false

    const nodeText = node.textContent
    const len = nodeText.length

    if (len > 0 && node.isLeaf) {
      lastNodeEnd = nodePos + node.nodeSize
      if (textSeen + len > offset) {
        result = nodePos + (offset - textSeen)
        found = true
        return false
      }
      textSeen += len
    }

    return !node.isLeaf
  })

  if (!found && offset === textSeen) {
    return lastNodeEnd
  }

  return result
}

const findAllTextRanges = (doc: Node, searchText: string): TextRange[] => {
  const docText = proseTextContent(doc)
  const ranges: TextRange[] = []
  let start = 0
  while (true) {
    const offset = docText.indexOf(searchText, start)
    if (offset === -1) return ranges
    ranges.push({
      from: textOffsetToPos(doc, offset),
      to: textOffsetToPos(doc, offset + searchText.length),
    })
    start = offset + 1
  }
}

const toResolvedAnnotations = (a: Annotation, doc: Node, startIndex: number): ResolvedAnnotation[] =>
  findAllTextRanges(doc, a.text).map((range, i) => {
    const resolved: ResolvedAnnotation = { index: startIndex + i, from: range.from, to: range.to, color: a.color }
    if (a.id) resolved.id = a.id
    if (a.review) resolved.hasReview = true
    return resolved
  })

const resolveAnnotations = (doc: Node, annotations: Annotation[]): ResolvedAnnotation[] => {
  let index = 0
  return annotations.flatMap((a) => {
    const resolved = toResolvedAnnotations(a, doc, index)
    index += Math.max(resolved.length, 1)
    return resolved
  })
}

type PluginState = {
  annotations: Annotation[]
  decorations: DecorationSet
}

const computeDecorations = (doc: Node, annotations: Annotation[]): DecorationSet => {
  const resolved = resolveAnnotations(doc, annotations)
  const segments = segmentByOverlap(resolved)
  const markers = createMarkerDecorations(resolved)
  const reviews = createReviewDecorations(resolved)
  return createDecorationSet(doc, segments, markers, reviews)
}

export const createAnnotationsPlugin = (): Plugin =>
  new Plugin({
    key: pluginKey,
    state: {
      init: (): PluginState => ({ annotations: [], decorations: DecorationSet.empty }),
      apply: (tr, pluginState, _oldState, newState) => {
        const newAnnotations = tr.getMeta(pluginKey) as Annotation[] | undefined
        if (newAnnotations !== undefined) {
          return {
            annotations: newAnnotations,
            decorations: computeDecorations(newState.doc, newAnnotations),
          }
        }
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
