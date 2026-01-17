import type { Block, InlineContent } from "./block"
import type { BlockTree } from "./selectors"

export function blocksToMarkdown(tree: BlockTree): string {
  if (!tree.head_id || !tree.blocks) return ""
  return collectMarkdown(tree.blocks, tree.head_id, 0).trim()
}

function collectMarkdown(blocks: Record<string, Block>, startId: string, depth: number): string {
  const lines: string[] = []
  let currentId: string | undefined = startId

  while (currentId) {
    const block: Block | undefined = blocks[currentId]
    if (!block) break

    const text = extractInlineText(block.content)
    const line = blockToMarkdown(block.type, text, block.props, depth)
    if (line !== null) lines.push(line)

    if (block.first_child_id) {
      const childMarkdown = collectMarkdown(blocks, block.first_child_id, depth + 1)
      if (childMarkdown) lines.push(childMarkdown)
    }

    currentId = block.next_id
  }

  return lines.join("\n")
}

function blockToMarkdown(
  type: string,
  text: string,
  props: Block["props"],
  depth: number
): string | null {
  const indent = "  ".repeat(depth)

  switch (type) {
    case "paragraph":
      return text ? `${indent}${text}` : ""
    case "heading":
      const level = props?.level ?? 1
      const hashes = "#".repeat(Math.min(level, 6))
      return `${hashes} ${text}`
    case "bulletListItem":
      return `${indent}- ${text}`
    case "numberedListItem":
      return `${indent}1. ${text}`
    case "checkListItem":
      const checked = props?.checked ? "x" : " "
      return `${indent}- [${checked}] ${text}`
    case "blockquote":
      return `${indent}> ${text}`
    case "codeBlock":
      const lang = props?.language ?? ""
      return `\`\`\`${lang}\n${text}\n\`\`\``
    case "image":
      return props?.url ? `![${text || "image"}](${props.url})` : null
    case "table":
      return text ? `${indent}${text}` : null
    default:
      return text ? `${indent}${text}` : null
  }
}

function extractInlineText(content?: InlineContent[]): string {
  if (!content) return ""
  return content.map(extractSingleInline).join("")
}

function extractSingleInline(inline: InlineContent): string {
  if (inline.content && inline.content.length > 0) {
    return inline.content.map(s => s.text).join("")
  }
  return inline.text ?? ""
}
