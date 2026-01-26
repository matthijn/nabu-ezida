"use client"

import { useNodeViewContext, type NodeViewContentRef } from "@prosemirror-adapter/react"
import { getBlockConfig } from "~/domain/blocks"
import { parseCallout } from "~/domain/blocks/callout"
import { CalloutBlockView } from "./view"

type BlockSpacerProps = {
  onClick: () => void
}

const BlockSpacer = ({ onClick }: BlockSpacerProps) => (
  <div
    className="h-2 w-full cursor-text hover:bg-neutral-100 transition-colors rounded"
    onClick={onClick}
  />
)

type CodeBlockFallbackProps = {
  language: string | undefined
  contentRef: NodeViewContentRef
  invalid?: boolean
}

const CodeBlockFallback = ({ language, contentRef, invalid }: CodeBlockFallbackProps) => (
  <pre className={`code-block${invalid ? " code-block-invalid" : ""}`} data-language={language}>
    <code ref={contentRef} />
  </pre>
)

export const CalloutNodeView = () => {
  const { node, view, getPos, contentRef } = useNodeViewContext()

  const language = node.attrs.language as string | undefined
  const config = language ? getBlockConfig(language) : undefined
  const isCallout = config?.renderer === "callout"
  const data = isCallout ? parseCallout(node.textContent) : null

  if (!isCallout || !data) {
    return <CodeBlockFallback language={language} contentRef={contentRef} invalid={isCallout && !data} />
  }

  const handleDelete = () => {
    const pos = getPos()
    if (pos === undefined) return
    const tr = view.state.tr.delete(pos, pos + node.nodeSize)
    view.dispatch(tr)
  }

  const handleInsertBefore = () => {
    const pos = getPos()
    if (pos === undefined) return
    const paragraph = view.state.schema.nodes.paragraph.create()
    const tr = view.state.tr.insert(pos, paragraph)
    view.dispatch(tr)
    view.focus()
  }

  return (
    <>
      <BlockSpacer onClick={handleInsertBefore} />
      <div contentEditable={false}>
        <CalloutBlockView data={data} onDelete={handleDelete} />
      </div>
    </>
  )
}
