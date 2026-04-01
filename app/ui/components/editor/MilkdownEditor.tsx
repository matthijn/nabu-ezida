"use client"

import { useEffect, useMemo, useRef } from "react"
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
import { Plugin, PluginKey } from "prosemirror-state"
import { createAnnotationsPlugin, annotationsMeta } from "~/lib/editor/annotations"
import { createSpotlightPlugin, spotlightMeta } from "~/lib/editor/spotlight"
import { createHiddenBlocksPlugin } from "~/lib/editor/hidden-blocks"
import { createCalloutBlocksPlugin } from "~/lib/editor/callout-blocks"
import { AnnotationHover } from "./AnnotationHover"
import { ReadOnlyProvider } from "./ReadOnlyContext"
import { useFiles } from "~/ui/hooks/useFiles"
import { getAnnotations } from "~/lib/files"
import type { Annotation } from "~/domain/data-blocks/attributes/annotations/selectors"
import type { Spotlight } from "~/lib/editor/spotlight"

const ANNOTATION_BATCH_SIZE = 20

const readOnlyKey = new PluginKey("readOnly")

const createReadOnlyPlugin = () =>
  new Plugin({
    key: readOnlyKey,
    props: { editable: () => false },
  })

interface MilkdownEditorCoreProps {
  defaultValue: string
  debugMode: boolean
  readOnly: boolean
  spotlight: Spotlight | null
}

const dispatchAnnotationBatches = (
  getEditor: () => Editor | undefined,
  annotations: Annotation[],
  onCancel: { cancelled: boolean }
): void => {
  if (annotations.length === 0) return

  let cursor = 0
  const step = () => {
    if (onCancel.cancelled) return
    const editor = getEditor()
    if (!editor) return

    cursor = Math.min(cursor + ANNOTATION_BATCH_SIZE, annotations.length)
    const batch = annotations.slice(0, cursor)

    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      view.dispatch(view.state.tr.setMeta(annotationsMeta, batch))
    })

    if (cursor < annotations.length) requestAnimationFrame(step)
  }

  requestAnimationFrame(step)
}

const MilkdownEditorCore = ({
  defaultValue,
  debugMode,
  readOnly,
  spotlight,
}: MilkdownEditorCoreProps) => {
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

  const readOnlyPlugin = $prose(createReadOnlyPlugin)

  useEditor(
    (root) => {
      const editor = Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root)
          ctx.set(defaultValueCtx, defaultValue)
        })
        .use(commonmark)
        .use(gfm)
        .use(annotationsPlugin)
        .use(spotlightPlugin)

      if (readOnly) {
        editor.use(readOnlyPlugin)
      } else {
        editor.use(history).use(clipboard).use(gapCursorPlugin)
      }

      if (debugMode) return editor

      return editor.use(hiddenBlocksPlugin).use(calloutBlocksPlugin)
    },
    [debugMode, readOnly]
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
  }, [loading, getEditor, defaultValue])

  useEffect(() => {
    if (loading) return
    const editor = getEditor()
    if (!editor) return
    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx)
      view.dispatch(view.state.tr.setMeta(spotlightMeta, spotlight))
    })
  }, [loading, getEditor, spotlight])

  useEffect(() => {
    if (loading) return
    const cancel = { cancelled: false }
    dispatchAnnotationBatches(getEditor, annotations, cancel)
    return () => {
      cancel.cancelled = true
    }
  }, [loading, getEditor, annotations])

  return (
    <AnnotationHover annotations={annotations}>
      <Milkdown />
    </AnnotationHover>
  )
}

interface MilkdownEditorProps {
  content: string
  debugMode?: boolean
  readOnly?: boolean
  spotlight?: Spotlight | null
}

export const MilkdownEditor = ({
  content,
  debugMode = false,
  readOnly = false,
  spotlight = null,
}: MilkdownEditorProps) => {
  const containerClass = readOnly
    ? "w-full text-default-font"
    : "w-full max-w-[768px] text-default-font"
  return (
    <ReadOnlyProvider value={readOnly}>
      <div className={containerClass}>
        <MilkdownProvider>
          <ProsemirrorAdapterProvider>
            <MilkdownEditorCore
              defaultValue={content}
              debugMode={debugMode}
              readOnly={readOnly}
              spotlight={spotlight}
            />
          </ProsemirrorAdapterProvider>
        </MilkdownProvider>
      </div>
    </ReadOnlyProvider>
  )
}
