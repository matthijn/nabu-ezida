import type { SearchHit } from "~/domain/search"
import type { FileStore } from "~/lib/files"
import { findAnnotationById } from "~/domain/data-blocks/attributes/annotations/selectors"
import { findMatchOffset } from "~/lib/patch/diff/search"
import {
  findBlockById,
  parseCodeBlocks,
  findSingletonBlock,
  type CodeBlock,
} from "~/lib/data-blocks/parse"

export const extractBlockSlice = (content: string, blockStart: number, blockEnd: number): string =>
  content.slice(blockStart, blockEnd)

export const extractIntroSlice = (content: string, maxLines = 10): string => {
  const blocks = parseCodeBlocks(content)
  const ranges = toLineRanges(content, blocks)
  const allLines = splitLines(content)
  const proseLines = stripCodeBlockLines(allLines, ranges)
  return proseLines.slice(0, maxLines).join("\n")
}

export const extractSearchSlice = (hit: SearchHit, files: FileStore): string | null => {
  const content = files[hit.file]
  if (!content) return null

  const slice = extractRawSlice(hit, content, files)
  if (!slice) return null

  return appendAttributes(slice, content)
}

const splitLines = (content: string): string[] => content.split("\n")

interface LineRange {
  startLine: number
  endLine: number
}

const toLineRanges = (content: string, blocks: CodeBlock[]): LineRange[] =>
  blocks.map((block) => {
    const startLine = splitLines(content.slice(0, block.start)).length - 1
    const blockLineCount = splitLines(content.slice(block.start, block.end)).length
    return { startLine, endLine: startLine + blockLineCount - 1 }
  })

const isLineInsideBlock = (lineIndex: number, ranges: LineRange[]): boolean =>
  ranges.some((r) => lineIndex >= r.startLine && lineIndex <= r.endLine)

const stripCodeBlockLines = (lines: string[], ranges: LineRange[]): string[] =>
  lines.filter((_, i) => !isLineInsideBlock(i, ranges))

const stripCodeBlocks = (content: string): string => {
  const blocks = parseCodeBlocks(content)
  const ranges = toLineRanges(content, blocks)
  const allLines = splitLines(content)
  return stripCodeBlockLines(allLines, ranges).join("\n")
}

const extractProseWindow = (prose: string, matchStart: number, matchEnd: number): string =>
  prose.slice(matchStart, matchEnd)

const findAttributesBlock = (content: string): string | null => {
  const block = findSingletonBlock(content, "json-attributes")
  if (!block) return null
  return content.slice(block.start, block.end)
}

const appendAttributes = (slice: string, content: string): string => {
  const attributes = findAttributesBlock(content)
  if (!attributes) return slice
  return `${slice}\n\n${attributes}`
}

const hitHasText = (hit: SearchHit): hit is SearchHit & { text: string } => hit.text !== undefined
const hitHasId = (hit: SearchHit): hit is SearchHit & { id: string } => hit.id !== undefined

const extractRawSlice = (hit: SearchHit, content: string, files: FileStore): string | null => {
  if (hitHasText(hit)) return extractTextSlice(content, hit.text)
  if (hitHasId(hit)) return extractIdSlice(content, hit.id, files)
  return extractIntroSlice(content)
}

const extractIdSlice = (content: string, id: string, files: FileStore): string | null => {
  const callout = findBlockById(content, "json-callout", id)
  if (callout) return extractBlockSlice(content, callout.block.start, callout.block.end)

  const annotation = findAnnotationById(files, id)
  if (!annotation) return null

  const stripped = stripCodeBlocks(content)
  const offset = findMatchOffset(stripped, annotation.text)
  if (!offset) return null

  return extractProseWindow(stripped, offset.start, offset.end)
}

const extractTextSlice = (content: string, text: string): string | null => {
  const stripped = stripCodeBlocks(content)
  const offset = findMatchOffset(stripped, text)
  if (!offset) return null

  return extractProseWindow(stripped, offset.start, offset.end)
}
