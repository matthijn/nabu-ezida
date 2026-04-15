import { findMatches, type Match } from "~/lib/patch/diff/search"
import { parseCodeBlocks, findBlockById, stripBlock } from "./parse"
import { generateShortId } from "./uuid"
import { isKnownBlockType } from "./registry"

export type AnchorResult<T> = ({ ok: true } & T) | { ok: false; error: string }

type InsertResult = AnchorResult<{ content: string; generatedId: string }>
type MoveResult = AnchorResult<{ content: string }>

const CONTEXT_EXPAND = 2

const endOfLine = (content: string, line: number): number => {
  let pos = 0
  for (let i = 0; i <= line && pos <= content.length; i++) {
    if (i === line) {
      const eol = content.indexOf("\n", pos)
      return eol === -1 ? content.length : eol
    }
    const next = content.indexOf("\n", pos)
    if (next === -1) return content.length
    pos = next + 1
  }
  return content.length
}

const formatNotFound = (content: string): string => {
  const lineCount = content.split("\n").length
  return `Anchor not found in document (${lineCount} lines). Provide more specific context.`
}

const expandedContext = (content: string, match: Match): string => {
  const lines = content.split("\n")
  const start = Math.max(0, match.start - CONTEXT_EXPAND)
  const end = Math.min(lines.length - 1, match.end + CONTEXT_EXPAND)
  return lines
    .slice(start, end + 1)
    .map((l, i) => `  ${start + i + 1}: ${l}`)
    .join("\n")
}

const formatAmbiguous = (content: string, matches: Match[]): string => {
  const sections = matches.map(
    (m, i) => `Match ${i + 1} (lines ${m.start + 1}-${m.end + 1}):\n${expandedContext(content, m)}`
  )
  return `Ambiguous anchor — ${matches.length} matches found. Expand context to disambiguate:\n\n${sections.join("\n\n")}`
}

const isInsideCodeBlock = (content: string, charOffset: number): boolean => {
  const blocks = parseCodeBlocks(content)
  return blocks.some(
    (b) => isKnownBlockType(b.language) && charOffset > b.start && charOffset < b.end
  )
}

const resolveAnchor = (
  content: string,
  anchorContext: string
): { ok: true; insertAfterLine: number } | { ok: false; error: string } => {
  const matches = findMatches(content, anchorContext)

  if (matches.length === 0) return { ok: false, error: formatNotFound(content) }
  if (matches.length > 1) return { ok: false, error: formatAmbiguous(content, matches) }

  const match = matches[0]
  const insertCharOffset = endOfLine(content, match.end)

  if (isInsideCodeBlock(content, insertCharOffset)) {
    return {
      ok: false,
      error: `Anchor resolves inside a data block. Place the anchor in the prose outside any block.`,
    }
  }

  return { ok: true, insertAfterLine: match.end }
}

const formatNewBlock = (language: string, generatedId: string): string =>
  `\n\n\`\`\`${language}\n{"id":"${generatedId}"}\n\`\`\`\n`

export const insertBlockAtAnchor = (
  content: string,
  language: string,
  anchorContext: string,
  idPrefix: string
): InsertResult => {
  const anchor = resolveAnchor(content, anchorContext)
  if (!anchor.ok) return anchor

  const generatedId = `${idPrefix}-${generateShortId()}`
  const insertAt = endOfLine(content, anchor.insertAfterLine)
  const newContent =
    content.slice(0, insertAt) + formatNewBlock(language, generatedId) + content.slice(insertAt)

  return { ok: true, content: newContent, generatedId }
}

export const moveBlockToAnchor = (
  content: string,
  language: string,
  blockId: string,
  anchorContext: string
): MoveResult => {
  const found = findBlockById(content, language, blockId)
  if (!found) return { ok: false, error: `No \`${language}\` block with id "${blockId}"` }

  const stripped = stripBlock(content, found.block)
  const anchor = resolveAnchor(stripped, anchorContext)
  if (!anchor.ok) return anchor

  const blockText = content.slice(found.block.start, found.block.end)
  const insertAt = endOfLine(stripped, anchor.insertAfterLine)
  const newContent =
    stripped.slice(0, insertAt) + "\n\n" + blockText + "\n" + stripped.slice(insertAt)

  return { ok: true, content: newContent }
}
