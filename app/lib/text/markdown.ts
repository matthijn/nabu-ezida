import { unified } from "unified"
import remarkParse from "remark-parse"
import { toString } from "mdast-util-to-string"

export const mdToPlainText = (markdown: string): string => {
  const ast = unified().use(remarkParse).parse(markdown)
  return toString(ast)
}

export type MarkdownBlock = {
  type: string
  startLine: number
  endLine: number
  raw: string
}

const parser = unified().use(remarkParse)

export const parseMarkdownBlocks = (raw: string): MarkdownBlock[] => {
  const lines = raw.split("\n")
  const ast = parser.parse(raw)

  return ast.children.map((node) => ({
    type: node.type,
    startLine: node.position?.start.line ?? 1,
    endLine: node.position?.end.line ?? 1,
    raw: lines.slice((node.position?.start.line ?? 1) - 1, node.position?.end.line ?? 1).join("\n"),
  }))
}

const blockLineCount = (block: MarkdownBlock): number =>
  block.endLine - block.startLine + 1

export const splitByLines = (raw: string, targetLines: number): string[] => {
  const blocks = parseMarkdownBlocks(raw)
  const chunks: string[] = []
  let currentBlocks: MarkdownBlock[] = []
  let currentLineCount = 0

  for (const block of blocks) {
    const blockLines = blockLineCount(block)

    if (currentLineCount + blockLines > targetLines && currentLineCount > 0) {
      chunks.push(currentBlocks.map((b) => b.raw).join("\n\n"))
      currentBlocks = []
      currentLineCount = 0
    }

    currentBlocks.push(block)
    currentLineCount += blockLines
  }

  if (currentBlocks.length > 0) {
    chunks.push(currentBlocks.map((b) => b.raw).join("\n\n"))
  }

  return chunks
}
