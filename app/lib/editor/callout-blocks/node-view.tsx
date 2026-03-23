"use client"

import { useRef, useMemo, useEffect } from "react"
import { useNodeViewContext, type NodeViewContentRef } from "@prosemirror-adapter/react"
import type { DecorationSet } from "prosemirror-view"
import { getBlockConfig } from "~/lib/data-blocks/registry"
import { parseCallout } from "~/domain/data-blocks/callout/schema"
import { useIsReadOnly } from "~/ui/components/editor/ReadOnlyContext"
import { CalloutBlockView } from "./view"
import { applyDOMHighlights, type HighlightEntry } from "./highlight"

interface BlockSpacerProps {
  onClick: () => void
}

const BlockSpacer = ({ onClick }: BlockSpacerProps) => (
  <div
    className="h-2 w-full cursor-text hover:bg-neutral-100 transition-colors rounded"
    onClick={onClick}
  />
)

interface CodeBlockFallbackProps {
  language: string | undefined
  contentRef: NodeViewContentRef
  invalid?: boolean
}

const CodeBlockFallback = ({ language, contentRef, invalid }: CodeBlockFallbackProps) => (
  <pre className={`code-block${invalid ? " code-block-invalid" : ""}`} data-language={language}>
    <code ref={contentRef} />
  </pre>
)

const extractHighlights = (innerDecorations: unknown, textContent: string): HighlightEntry[] => {
  const decoSet = innerDecorations as DecorationSet
  if (!decoSet.find) return []
  return decoSet
    .find()
    .map((d) => ({
      text: textContent.slice(d.from, d.to),
      isSpotlight: d.spec?.spotlight === true,
    }))
    .filter((e) => e.text.length > 0)
}

export const CalloutNodeView = () => {
  const { node, view, getPos, contentRef, innerDecorations } = useNodeViewContext()
  const containerRef = useRef<HTMLDivElement>(null)
  const isReadOnly = useIsReadOnly()

  const language = node.attrs.language as string | undefined
  const config = language ? getBlockConfig(language) : undefined
  const isCallout = config?.renderer === "callout"
  const data = isCallout ? parseCallout(node.textContent) : null

  const highlights = useMemo(
    () => (isCallout ? extractHighlights(innerDecorations, node.textContent) : []),
    [isCallout, innerDecorations, node.textContent]
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container || !data || highlights.length === 0) return
    return applyDOMHighlights(container, data.id, highlights)
  }, [data, highlights])

  if (!isCallout || !data) {
    return (
      <CodeBlockFallback language={language} contentRef={contentRef} invalid={isCallout && !data} />
    )
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
      {!isReadOnly && <BlockSpacer onClick={handleInsertBefore} />}
      <div ref={containerRef} contentEditable={false} data-id={data.id}>
        <CalloutBlockView data={data} onDelete={handleDelete} />
      </div>
    </>
  )
}
