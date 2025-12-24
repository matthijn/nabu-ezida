import { NodeViewContent } from "@tiptap/react"

export const CodeBlockView = () => (
  <pre>
    <NodeViewContent as={"code" as "div"} />
  </pre>
)
