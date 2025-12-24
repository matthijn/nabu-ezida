import { NodeViewContent, type NodeViewProps } from "@tiptap/react"

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6
const HEADING_TAGS: Record<HeadingLevel, string> = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
  6: "h6",
}

export const HeadingView = ({ node }: NodeViewProps) => {
  const level = node.attrs.level as HeadingLevel
  const tag = HEADING_TAGS[level] as "div"
  return <NodeViewContent as={tag} />
}
