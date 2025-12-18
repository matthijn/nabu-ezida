import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import type { StoredAnnotation, OverlapSegment } from "~/domain/annotations"
import { segmentByOverlap, createBackground, colorsForCodes } from "~/domain/annotations"
import { resolveAnnotations } from "./resolve"

export const annotationPluginKey = new PluginKey<DecorationSet>("annotations")

const createDecoration = (segment: OverlapSegment): Decoration => {
  const colors = colorsForCodes(segment.codeIds)
  const background = createBackground(colors)

  return Decoration.inline(segment.from, segment.to, {
    class: "annotation-highlight",
    style: `background: ${background}`,
    "data-codes": segment.codeIds.join(","),
  })
}

const buildDecorations = (doc: ProseMirrorNode, annotations: StoredAnnotation[]): DecorationSet => {
  const resolved = resolveAnnotations(doc, annotations)
  const segments = segmentByOverlap(resolved)
  return DecorationSet.create(doc, segments.map(createDecoration))
}

export const createAnnotationPlugin = (getAnnotations: () => StoredAnnotation[]) =>
  new Plugin({
    key: annotationPluginKey,
    state: {
      init: (_, { doc }) => buildDecorations(doc, getAnnotations()),
      apply: (tr, decorations, _, newState) => {
        const meta = tr.getMeta(annotationPluginKey)
        if (meta?.rebuild) {
          return buildDecorations(newState.doc, getAnnotations())
        }
        if (tr.docChanged) {
          return decorations.map(tr.mapping, newState.doc)
        }
        return decorations
      },
    },
    props: {
      decorations: state => annotationPluginKey.getState(state),
    },
  })
