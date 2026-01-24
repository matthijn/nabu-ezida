"use client"

import { useNodeViewContext } from "@prosemirror-adapter/react"
import { getBlockConfig } from "~/domain/blocks"
import { CalloutSchema } from "~/domain/blocks/callout"
import { CalloutBlockView } from "./view"

const parseCalloutData = (content: string) => {
  try {
    const json = JSON.parse(content)
    const result = CalloutSchema.safeParse(json)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export const CalloutNodeView = () => {
  const { node, view, getPos, contentRef } = useNodeViewContext()

  const language = node.attrs.language as string | undefined
  const config = language ? getBlockConfig(language) : undefined
  const isCallout = config?.renderer === "callout"

  if (!isCallout) {
    return (
      <pre className="code-block" data-language={language}>
        <code ref={contentRef} />
      </pre>
    )
  }

  const data = parseCalloutData(node.textContent)

  if (!data) {
    return (
      <pre className="code-block code-block-invalid" data-language={language}>
        <code ref={contentRef} />
      </pre>
    )
  }

  const handleDelete = () => {
    const pos = getPos()
    if (pos === undefined) return
    const tr = view.state.tr.delete(pos, pos + node.nodeSize)
    view.dispatch(tr)
  }

  return <CalloutBlockView data={data} onDelete={handleDelete} />
}
