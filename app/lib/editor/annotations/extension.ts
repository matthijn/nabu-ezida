import { Extension } from "@tiptap/react"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { DecorationSet } from "@tiptap/pm/view"
import type { Annotation } from "~/domain/document/annotations"
import { segmentByOverlap } from "~/domain/document/annotations"
import { resolveAnnotationsInDoc } from "./find-positions"
import { createDecorationSet } from "./decorations"

const annotationPluginKey = new PluginKey("annotations")

type AnnotationState = {
  annotations: Annotation[]
  decorations: DecorationSet
}

export type AnnotationOptions = {
  annotations: Annotation[]
}

export const Annotations = Extension.create<AnnotationOptions>({
  name: "annotations",

  addOptions() {
    return {
      annotations: [],
    }
  },

  addProseMirrorPlugins() {
    const { annotations } = this.options

    return [
      new Plugin({
        key: annotationPluginKey,

        state: {
          init: (_, state) => {
            const resolved = resolveAnnotationsInDoc(state, annotations)
            const segments = segmentByOverlap(resolved)
            return {
              annotations,
              decorations: createDecorationSet(state.doc, segments),
            } as AnnotationState
          },

          apply: (tr, pluginState, _oldState, newState) => {
            const meta = tr.getMeta(annotationPluginKey)

            if (meta?.annotations) {
              const resolved = resolveAnnotationsInDoc(newState, meta.annotations)
              const segments = segmentByOverlap(resolved)
              return {
                annotations: meta.annotations,
                decorations: createDecorationSet(newState.doc, segments),
              } as AnnotationState
            }

            if (tr.docChanged) {
              const { annotations } = pluginState as AnnotationState
              const resolved = resolveAnnotationsInDoc(newState, annotations)
              const segments = segmentByOverlap(resolved)
              return {
                annotations,
                decorations: createDecorationSet(newState.doc, segments),
              } as AnnotationState
            }

            return pluginState
          },
        },

        props: {
          decorations: (state) => {
            const pluginState = annotationPluginKey.getState(state) as AnnotationState | undefined
            return pluginState?.decorations ?? DecorationSet.empty
          },
        },
      }),
    ]
  },
})

export const setAnnotations = (annotations: Annotation[]) => ({
  key: annotationPluginKey,
  annotations,
})

export const getAnnotationPluginKey = () => annotationPluginKey
