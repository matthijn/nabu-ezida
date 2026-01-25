"use client"

import { useEffect, useRef } from "react"
import { Editor, rootCtx, defaultValueCtx } from "@milkdown/kit/core"
import { commonmark } from "@milkdown/kit/preset/commonmark"
import { gfm } from "@milkdown/kit/preset/gfm"
import { history } from "@milkdown/kit/plugin/history"
import { clipboard } from "@milkdown/kit/plugin/clipboard"
import { gapCursor } from "@milkdown/kit/prose/gapcursor"
import "@milkdown/kit/prose/gapcursor/style/gapcursor.css"
import { Milkdown, MilkdownProvider, useEditor, useInstance } from "@milkdown/react"
import { ProsemirrorAdapterProvider, useNodeViewFactory } from "@prosemirror-adapter/react"
import { $prose, replaceAll } from "@milkdown/utils"
import type { Annotation } from "~/domain/document/annotations"
import { createAnnotationsPlugin } from "~/lib/editor/annotations"
import { createHiddenBlocksPlugin } from "~/lib/editor/hidden-blocks"
import { createCalloutBlocksPlugin } from "~/lib/editor/callout-blocks"
import { AnnotationHover } from "./AnnotationHover"

type MilkdownEditorCoreProps = {
  defaultValue: string
  annotations: Annotation[]
  debugMode: boolean
}

const MilkdownEditorCore = ({ defaultValue, annotations, debugMode }: MilkdownEditorCoreProps) => {
  const nodeViewFactory = useNodeViewFactory()
  const annotationsPlugin = $prose(() => createAnnotationsPlugin(annotations))
  const hiddenBlocksPlugin = $prose(() => createHiddenBlocksPlugin())
  const gapCursorPlugin = $prose(gapCursor)
  const calloutBlocksPlugin = createCalloutBlocksPlugin(nodeViewFactory)
  const prevContentRef = useRef(defaultValue)
  const [loading, getEditor] = useInstance()

  useEditor(
    (root) => {
      const editor = Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root)
          ctx.set(defaultValueCtx, defaultValue)
        })
        .use(commonmark)
        .use(gfm)
        .use(history)
        .use(clipboard)
        .use(gapCursorPlugin)
        .use(annotationsPlugin)

      if (debugMode) return editor

      return editor.use(hiddenBlocksPlugin).use(calloutBlocksPlugin)
    },
    [debugMode]
  )

  useEffect(() => {
    if (loading) return
    if (defaultValue === prevContentRef.current) return
    prevContentRef.current = defaultValue
    getEditor()?.action(replaceAll(defaultValue))
  }, [loading, getEditor, defaultValue])

  return (
    <AnnotationHover annotations={annotations}>
      <Milkdown />
    </AnnotationHover>
  )
}

export type MilkdownEditorProps = {
  content: string
  annotations?: Annotation[]
  debugMode?: boolean
}

export const MilkdownEditor = ({ content, annotations = [], debugMode = false }: MilkdownEditorProps) => {
  return (
    <div className="w-full max-w-[768px] text-default-font">
      <MilkdownProvider>
        <ProsemirrorAdapterProvider>
          <MilkdownEditorCore defaultValue={content} annotations={annotations} debugMode={debugMode} />
        </ProsemirrorAdapterProvider>
      </MilkdownProvider>
    </div>
  )
}
