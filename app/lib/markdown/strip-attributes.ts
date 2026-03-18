import { unified } from "unified"
import remarkParse from "remark-parse"
import type { Code, Heading } from "mdast"

interface MarkdownBlock {
  type: string
  lang: string | null
  depth: number | null
  startLine: number
  endLine: number
  raw: string
}

const parser = unified().use(remarkParse)

const parseMarkdownBlocks = (raw: string): MarkdownBlock[] => {
  const lines = raw.split("\n")
  const ast = parser.parse(raw)

  return ast.children.map((node) => ({
    type: node.type,
    lang: node.type === "code" ? ((node as Code).lang ?? null) : null,
    depth: node.type === "heading" ? (node as Heading).depth : null,
    startLine: node.position?.start.line ?? 1,
    endLine: node.position?.end.line ?? 1,
    raw: lines.slice((node.position?.start.line ?? 1) - 1, node.position?.end.line ?? 1).join("\n"),
  }))
}

const isAttributesBlock = (block: MarkdownBlock): boolean =>
  block.type === "code" && block.lang === "json-attributes"

export const stripAttributesBlock = (raw: string): string =>
  parseMarkdownBlocks(raw)
    .filter((b) => !isAttributesBlock(b))
    .map((b) => b.raw)
    .join("\n\n")
    .trim()
