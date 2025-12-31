import type { DocumentContext, BlockContext } from "./store"

const formatBlock = (block: BlockContext, label: string): string =>
  `${label}: [${block.type}] "${block.textContent}"`

export const formatDocumentContext = (ctx: DocumentContext): string => {
  const lines: string[] = [
    `Document: "${ctx.documentName}" (${ctx.documentId})`,
    "",
    "Position in document:",
  ]

  if (ctx.blockBefore) {
    lines.push(formatBlock(ctx.blockBefore, "Before"))
  } else {
    lines.push("Before: [start of document]")
  }

  lines.push("[you are here]")

  if (ctx.blockAfter) {
    lines.push(formatBlock(ctx.blockAfter, "After"))
  } else {
    lines.push("After: [end of document]")
  }

  return lines.join("\n")
}
