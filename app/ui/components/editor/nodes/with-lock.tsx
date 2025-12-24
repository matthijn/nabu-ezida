import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react"
import { DOMSerializer, type Node, type Schema } from "@tiptap/pm/model"
import type { ComponentType } from "react"

export type LockableViewProps = NodeViewProps

const serializeNodeToHtml = (node: Node, schema: Schema): string => {
  const serializer = DOMSerializer.fromSchema(schema)
  const dom = serializer.serializeNode(node)
  const container = document.createElement("div")
  container.appendChild(dom)
  return container.innerHTML
}

const LockedContent = ({ html }: { html: string }) => (
  <div
    contentEditable={false}
    className="border-2 border-error-500 rounded-md"
    dangerouslySetInnerHTML={{ __html: html }}
  />
)

export const withLock = (Component: ComponentType<LockableViewProps>) => {
  const WrappedComponent = (props: NodeViewProps) => {
    const lockedBy = props.node.attrs.lockedBy as string | null

    if (lockedBy) {
      const html = serializeNodeToHtml(props.node, props.editor.schema)
      return (
        <NodeViewWrapper>
          <LockedContent html={html} />
        </NodeViewWrapper>
      )
    }

    return (
      <NodeViewWrapper>
        <Component {...props} />
      </NodeViewWrapper>
    )
  }

  WrappedComponent.displayName = `withLock(${Component.displayName || Component.name})`
  return WrappedComponent
}
