import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react"
import { DOMSerializer, type Node, type Schema } from "@tiptap/pm/model"
import type { ComponentType } from "react"

export type LockableViewProps = NodeViewProps

const isLocked = (node: Node): boolean =>
  !!node.attrs.lockedBy

const serializeNodeToHtml = (node: Node, schema: Schema): string => {
  const serializer = DOMSerializer.fromSchema(schema)
  const dom = serializer.serializeNode(node)
  const container = document.createElement("div")
  container.appendChild(dom)
  return container.innerHTML
}

export const withLock = (Component: ComponentType<LockableViewProps>) => {
  const WrappedComponent = (props: NodeViewProps) => {
    const blockId = props.node.attrs.blockId as string | undefined

    if (isLocked(props.node)) {
      const html = serializeNodeToHtml(props.node, props.editor.schema)
      return (
        <NodeViewWrapper data-block-id={blockId}>
          <div contentEditable={false} dangerouslySetInnerHTML={{ __html: html }} />
        </NodeViewWrapper>
      )
    }

    return (
      <NodeViewWrapper className="mb-4" data-block-id={blockId}>
        <Component {...props} />
      </NodeViewWrapper>
    )
  }

  WrappedComponent.displayName = `withLock(${Component.displayName || Component.name})`
  return WrappedComponent
}
