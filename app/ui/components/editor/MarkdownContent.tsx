"use client"

import { Editor, rootCtx, defaultValueCtx } from "@milkdown/kit/core"
import { commonmark } from "@milkdown/kit/preset/commonmark"
import { gfm } from "@milkdown/kit/preset/gfm"
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react"

type MarkdownContentCoreProps = {
  content: string
}

const MarkdownContentCore = ({ content }: MarkdownContentCoreProps) => {
  useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root)
        ctx.set(defaultValueCtx, content)
      })
      .use(commonmark)
      .use(gfm)
  )

  return <Milkdown />
}

type MarkdownContentProps = {
  content: string
  className?: string
}

export const MarkdownContent = ({ content, className }: MarkdownContentProps) => (
  <div className={className}>
    <MilkdownProvider>
      <MarkdownContentCore content={content} />
    </MilkdownProvider>
  </div>
)
