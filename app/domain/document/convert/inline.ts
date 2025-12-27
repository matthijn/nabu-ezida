import type { JSONContent } from "@tiptap/react"
import type { InlineContent, Styles } from "../block"
import { styleToMark, markToStyle, allStyleKeys, allMarkTypes } from "./mappings"

// Styles → Marks
export const stylesToMarks = (styles?: Styles): JSONContent["marks"] => {
  if (!styles) return undefined

  const marks = allStyleKeys
    .filter((key) => styles[key])
    .map((key) => ({ type: styleToMark(key)! }))

  return marks.length > 0 ? marks : undefined
}

// Marks → Styles (only boolean style keys)
export const marksToStyles = (marks?: JSONContent["marks"]): Styles | undefined => {
  if (!marks || marks.length === 0) return undefined

  const styles: Styles = {}
  for (const mark of marks) {
    const styleKey = markToStyle(mark.type)
    if (styleKey === "bold") styles.bold = true
    else if (styleKey === "italic") styles.italic = true
    else if (styleKey === "underline") styles.underline = true
    else if (styleKey === "strikethrough") styles.strikethrough = true
    else if (styleKey === "code") styles.code = true
  }

  return Object.keys(styles).length > 0 ? styles : undefined
}

// Single inline content → TipTap node
const inlineContentToNode = (inline: InlineContent): JSONContent => {
  const baseMarks = stylesToMarks(inline.styles)

  if (inline.type === "link") {
    const linkMark = { type: "link", attrs: { href: inline.href } }
    return {
      type: "text",
      text: inline.text ?? "",
      marks: baseMarks ? [linkMark, ...baseMarks] : [linkMark],
    }
  }

  return {
    type: "text",
    text: inline.text ?? "",
    marks: baseMarks,
  }
}

// InlineContent[] → TipTap content array
export const inlineToTiptap = (content?: InlineContent[]): JSONContent[] | undefined => {
  if (!content || content.length === 0) return undefined
  return content.map(inlineContentToNode)
}

// Extract link mark from marks array
const extractLinkMark = (marks?: JSONContent["marks"]) =>
  marks?.find((m) => m.type === "link")

// Filter out link marks
const nonLinkMarks = (marks?: JSONContent["marks"]) =>
  marks?.filter((m) => m.type !== "link")

// Single TipTap node → InlineContent
const nodeToInlineContent = (node: JSONContent): InlineContent | null => {
  if (node.type === "text") {
    const linkMark = extractLinkMark(node.marks)

    if (linkMark) {
      return {
        type: "link",
        text: node.text,
        href: linkMark.attrs?.href,
        styles: marksToStyles(nonLinkMarks(node.marks)),
      }
    }

    return {
      type: "text",
      text: node.text,
      styles: marksToStyles(node.marks),
    }
  }

  if (node.type === "mention") {
    return { type: "text", text: `@${node.attrs?.label ?? ""}` }
  }

  return null
}

// TipTap content → InlineContent[]
export const tiptapToInline = (content?: JSONContent[]): InlineContent[] | undefined => {
  if (!content || content.length === 0) return undefined

  const result = content
    .map(nodeToInlineContent)
    .filter((x): x is InlineContent => x !== null)

  return result.length > 0 ? result : undefined
}
