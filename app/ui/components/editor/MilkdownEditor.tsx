"use client"

import { Editor, rootCtx, defaultValueCtx } from "@milkdown/kit/core"
import { commonmark } from "@milkdown/kit/preset/commonmark"
import { gfm } from "@milkdown/kit/preset/gfm"
import { history } from "@milkdown/kit/plugin/history"
import { clipboard } from "@milkdown/kit/plugin/clipboard"
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react"

type MilkdownEditorCoreProps = {
  defaultValue: string
}

const MilkdownEditorCore = ({ defaultValue }: MilkdownEditorCoreProps) => {
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
  )

  return <Milkdown />
}

export type MilkdownEditorProps = {
  documentId: string
  documentName: string
}

export const MilkdownEditor = ({ documentId, documentName }: MilkdownEditorProps) => {
  const placeholder = `# ${documentName}

Welcome to **${documentName}**. This document is using Milkdown.

## Getting Started

Start typing here to edit this document.

- List item one
- List item two
- List item three

| Column A | Column B |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
`

  return (
    <div className="w-full max-w-[768px] text-default-font">
      <MilkdownProvider>
        <MilkdownEditorCore defaultValue={placeholder} />
      </MilkdownProvider>
    </div>
  )
}
