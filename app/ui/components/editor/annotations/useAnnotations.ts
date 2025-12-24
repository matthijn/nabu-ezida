import { useEffect, useRef } from "react"
import type { Annotation } from "~/domain/document"
import { createAnnotationPlugin, annotationPluginKey } from "./plugin"

/* eslint-disable @typescript-eslint/no-explicit-any */
export const useAnnotations = (
  editor: { _tiptapEditor: any } | null,
  annotations: Annotation[]
) => {
/* eslint-enable @typescript-eslint/no-explicit-any */
  const annotationsRef = useRef(annotations)
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!editor || initializedRef.current) return

    const tiptap = editor._tiptapEditor
    annotationsRef.current = annotations
    const plugin = createAnnotationPlugin(() => annotationsRef.current)

    tiptap.registerPlugin(plugin)
    initializedRef.current = true

    return () => {
      tiptap.unregisterPlugin(annotationPluginKey)
      initializedRef.current = false
    }
  }, [editor, annotations])

  useEffect(() => {
    if (!editor || !initializedRef.current) return
    if (annotations === annotationsRef.current) return

    annotationsRef.current = annotations
    const tiptap = editor._tiptapEditor
    const { state, view } = tiptap
    const tr = state.tr.setMeta(annotationPluginKey, { rebuild: true })
    view.dispatch(tr)
  }, [editor, annotations])
}
