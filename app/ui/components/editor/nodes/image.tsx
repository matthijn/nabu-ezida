import type { NodeViewProps } from "@tiptap/react"

export const ImageView = ({ node }: NodeViewProps) => (
  <img src={node.attrs.src} alt={node.attrs.alt ?? ""} />
)
