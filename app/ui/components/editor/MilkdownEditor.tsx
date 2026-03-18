"use client"

import { useEffect, useRef, useMemo } from "react"
import { Editor, rootCtx, defaultValueCtx, editorViewCtx } from "@milkdown/kit/core"
import { commonmark } from "@milkdown/kit/preset/commonmark"
import { gfm } from "@milkdown/kit/preset/gfm"
import { history } from "@milkdown/kit/plugin/history"
import { clipboard } from "@milkdown/kit/plugin/clipboard"
import { gapCursor } from "@milkdown/kit/prose/gapcursor"
import "@milkdown/kit/prose/gapcursor/style/gapcursor.css"
import { Milkdown, MilkdownProvider, useEditor, useInstance } from "@milkdown/react"
import { ProsemirrorAdapterProvider, useNodeViewFactory } from "@prosemirror-adapter/react"
import { $prose, replaceAll } from "@milkdown/utils"
import { createAnnotationsPlugin, annotationsMeta } from "~/lib/editor/annotations"
import { createSpotlightPlugin, spotlightMeta } from "~/lib/editor/spotlight"
import { createHiddenBlocksPlugin } from "~/lib/editor/hidden-blocks"
import { createCalloutBlocksPlugin } from "~/lib/editor/callout-blocks"
import { AnnotationHover } from "./AnnotationHover"
import { useFiles } from "~/ui/hooks/useFiles"
import { getAnnotations } from "~/lib/files"
import type { Spotlight } from "~/lib/editor/spotlight"

interface MilkdownEditorCoreProps {
  defaultValue: string
  debugMode: boolean
  spotlight: Spotlight | null
}

const MilkdownEditorCore = ({ defaultValue, debugMode, spotlight }: MilkdownEditorCoreProps) => {
  const { files } = useFiles()
  const nodeViewFactory = useNodeViewFactory()
  const annotationsPlugin = $prose(() => createAnnotationsPlugin())
  const spotlightPlugin = $prose(() => createSpotlightPlugin())
  const hiddenBlocksPlugin = $prose(() => createHiddenBlocksPlugin())
  const gapCursorPlugin = $prose(gapCursor)
  const calloutBlocksPlugin = createCalloutBlocksPlugin(nodeViewFactory)
  const prevContentRef = useRef(defaultValue)
  const [loading, getEditor] = useInstance()

  const annotations = useMemo(() => getAnnotations(files, defaultValue), [files, defaultValue])

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
        .use(spotlightPlugin)

      if (debugMode) return editor

      return editor.use(hiddenBlocksPlugin).use(calloutBlocksPlugin)
    },
    [debugMode]
  )

  useEffect(() => {
    if (loading) return
    const editor = getEditor()
    if (!editor) return

    const contentChanged = defaultValue !== prevContentRef.current
    prevContentRef.current = defaultValue

    if (contentChanged) {
      editor.action(replaceAll(defaultValue))
    }
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      const tr = view.state.tr
        .setMeta(annotationsMeta, annotations)
        .setMeta(spotlightMeta, spotlight)
      view.dispatch(tr)
    })
  }, [loading, getEditor, defaultValue, annotations, spotlight])

  return (
    <AnnotationHover annotations={annotations}>
      <Milkdown />
    </AnnotationHover>
  )
}

interface MilkdownEditorProps {
  content: string
  debugMode?: boolean
  spotlight?: Spotlight | null
}

export const MilkdownEditor = ({
  content,
  debugMode = false,
  spotlight = null,
}: MilkdownEditorProps) => {
  return (
    <div className="w-full max-w-[768px] text-default-font">
      <MilkdownProvider>
        <ProsemirrorAdapterProvider>
          <MilkdownEditorCore defaultValue={content} debugMode={debugMode} spotlight={spotlight} />
        </ProsemirrorAdapterProvider>
      </MilkdownProvider>
    </div>
  )
}
