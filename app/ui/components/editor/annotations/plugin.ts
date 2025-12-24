import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import type { Annotation, OverlapSegment } from "~/domain/document"
import { segmentByOverlap, createBackground } from "~/domain/document"
import { resolveAnnotations } from "./resolve"

export const annotationPluginKey = new PluginKey<DecorationSet>("annotations")

const createDecoration = (segment: OverlapSegment): Decoration => {
  const background = createBackground(segment.colors)

  return Decoration.inline(segment.from, segment.to, {
    class: "annotation-highlight",
    style: `background: ${background}`,
  })
}

const buildDecorations = (doc: ProseMirrorNode, annotations: Annotation[]): DecorationSet => {
  const resolved = resolveAnnotations(doc, annotations)
  const segments = segmentByOverlap(resolved)
  return DecorationSet.create(doc, segments.map(createDecoration))
}

export const createAnnotationPlugin = (getAnnotations: () => Annotation[]) =>
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
