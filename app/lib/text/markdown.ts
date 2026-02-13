import { unified } from "unified"
import remarkParse from "remark-parse"
import type { Code, Heading } from "mdast"
import { toString } from "mdast-util-to-string"

export const mdToPlainText = (markdown: string): string => {
  const ast = unified().use(remarkParse).parse(markdown)
  return toString(ast)
}

export type MarkdownBlock = {
  type: string
  lang: string | null
  depth: number | null
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
    lang: node.type === "code" ? (node as Code).lang ?? null : null,
    depth: node.type === "heading" ? (node as Heading).depth : null,
    startLine: node.position?.start.line ?? 1,
    endLine: node.position?.end.line ?? 1,
    raw: lines.slice((node.position?.start.line ?? 1) - 1, node.position?.end.line ?? 1).join("\n"),
  }))
}

const isAttributesBlock = (block: MarkdownBlock): boolean =>
  block.type === "code" && block.lang === "json-attributes"

const isProseBlock = (block: MarkdownBlock): boolean =>
  block.type !== "code"

export const stripAttributesBlock = (raw: string): string =>
  parseMarkdownBlocks(raw)
    .filter((b) => !isAttributesBlock(b))
    .map((b) => b.raw)
    .join("\n\n")
    .trim()

const blockLineCount = (block: MarkdownBlock): number =>
  block.endLine - block.startLine + 1

const isMajorHeading = (block: MarkdownBlock): boolean =>
  block.type === "heading" && (block.depth === 1 || block.depth === 2)

const isMinorHeading = (block: MarkdownBlock): boolean =>
  block.type === "heading" && block.depth !== null && block.depth >= 3

const canSplitBefore = (block: MarkdownBlock, prevBlock: MarkdownBlock | null): boolean => {
  // Can split before h1/h2
  if (isMajorHeading(block)) return true
  // Can split before paragraph, unless previous was h3+
  if (block.type === "paragraph") {
    if (prevBlock && isMinorHeading(prevBlock)) return false
    return true
  }
  // Can't split before anything else (code, list, table, h3+, etc.)
  return false
}

type SplitOptions = {
  stripAttributes?: boolean
  proseOnly?: boolean
}

export const splitByLines = (raw: string, targetLines: number, options: SplitOptions = {}): string[] => {
  const content = options.stripAttributes ? stripAttributesBlock(raw) : raw
  const allBlocks = parseMarkdownBlocks(content)
  const blocks = options.proseOnly ? allBlocks.filter(isProseBlock) : allBlocks
  const chunks: string[] = []
  let currentBlocks: MarkdownBlock[] = []
  let currentLineCount = 0

  for (const block of blocks) {
    const prevBlock = currentBlocks.length > 0 ? currentBlocks[currentBlocks.length - 1] : null
    const blockLines = blockLineCount(block)

    const shouldSplit =
      currentLineCount >= targetLines &&
      currentBlocks.length > 0 &&
      canSplitBefore(block, prevBlock)

    if (shouldSplit) {
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
