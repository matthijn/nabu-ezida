"use client"

import { Editor, rootCtx, defaultValueCtx } from "@milkdown/kit/core"
import { commonmark } from "@milkdown/kit/preset/commonmark"
import { gfm } from "@milkdown/kit/preset/gfm"
import { history } from "@milkdown/kit/plugin/history"
import { clipboard } from "@milkdown/kit/plugin/clipboard"
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react"
import { $prose } from "@milkdown/utils"
import type { Annotation } from "~/domain/document/annotations"
import { createAnnotationsPlugin } from "~/lib/editor/annotations"
import { AnnotationHover } from "./AnnotationHover"

type MilkdownEditorCoreProps = {
  defaultValue: string
  annotations: Annotation[]
}

const MilkdownEditorCore = ({ defaultValue, annotations }: MilkdownEditorCoreProps) => {
  const annotationsPlugin = $prose(() => createAnnotationsPlugin(annotations))

  useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root)
        ctx.set(defaultValueCtx, defaultValue)
      })
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(clipboard)
      .use(annotationsPlugin)
  )

  return (
    <AnnotationHover annotations={annotations}>
      <Milkdown />
    </AnnotationHover>
  )
}

export type MilkdownEditorProps = {
  content: string
  annotations?: Annotation[]
}

export const MilkdownEditor = ({ content, annotations = [] }: MilkdownEditorProps) => {
  return (
    <div className="w-full max-w-[768px] text-default-font">
      <MilkdownProvider>
        <MilkdownEditorCore defaultValue={content} annotations={annotations} />
      </MilkdownProvider>
    </div>
  )
}
