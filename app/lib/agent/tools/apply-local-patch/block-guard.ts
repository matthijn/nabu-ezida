import { parseV4ADiff, buildMatchText, type HunkPart } from "~/lib/patch/diff/parse"
import { findMatches, type Match } from "~/lib/patch/diff/search"
import { parseCodeBlocks, parseBlockJson } from "~/lib/data-blocks/parse"
import { isKnownBlockType } from "~/lib/data-blocks/registry"

export interface BlockTouch {
  language: string
  shortName: string
  blockId?: string
}

interface BlockLineSpan {
  language: string
  shortName: string
  startLine: number
  endLine: number
  blockId?: string
}

const stripJsonPrefix = (language: string): string =>
  language.startsWith("json-") ? language.slice(5) : language

const charToLine = (content: string, offset: number): number => {
  let line = 0
  for (let i = 0; i < offset && i < content.length; i++) {
    if (content[i] === "\n") line++
  }
  return line
}

const hasStringId = (data: unknown): data is { id: string } =>
  typeof data === "object" &&
  data !== null &&
  "id" in data &&
  typeof (data as Record<string, unknown>).id === "string"

const findBlockLineSpans = (content: string): BlockLineSpan[] =>
  parseCodeBlocks(content)
    .filter((b) => isKnownBlockType(b.language))
    .map((b) => {
      const parsed = parseBlockJson(b)
      return {
        language: b.language,
        shortName: stripJsonPrefix(b.language),
        startLine: charToLine(content, b.start),
        endLine: charToLine(content, b.end),
        blockId: parsed.ok && hasStringId(parsed.data) ? parsed.data.id : undefined,
      }
    })

const rangesOverlap = (aStart: number, aEnd: number, bStart: number, bEnd: number): boolean =>
  aStart <= bEnd && aEnd >= bStart

const isBlockModification = (span: BlockLineSpan, match: Match, parts: HunkPart[]): boolean => {
  let fileLine = match.start
  let hasRemoveInBlock = false
  let hasContextInBlock = false

  for (const part of parts) {
    if (part.type === "add") continue
    const inBlock = fileLine >= span.startLine && fileLine <= span.endLine
    if (inBlock) {
      if (part.type === "remove") hasRemoveInBlock = true
      else hasContextInBlock = true
    }
    fileLine++
  }

  if (!hasRemoveInBlock) return false
  if (hasContextInBlock) return true

  const isFullDelete = span.startLine >= match.start && span.endLine <= match.end
  return !isFullDelete
}

export const detectBlockTouches = (content: string, diff: string): BlockTouch[] => {
  const spans = findBlockLineSpans(content)
  if (spans.length === 0) return []

  const hunks = parseV4ADiff(diff)
  const seen = new Set<string>()
  const touches: BlockTouch[] = []

  for (const hunk of hunks) {
    const matchText = buildMatchText(hunk.parts)
    if (matchText === "") continue

    const matches = findMatches(content, matchText)
    if (matches.length === 0) continue

    const match = matches[0]
    for (const span of spans) {
      if (!rangesOverlap(match.start, match.end, span.startLine, span.endLine)) continue
      if (!isBlockModification(span, match, hunk.parts)) continue
      const key = `${span.language}:${span.blockId ?? ""}`
      if (seen.has(key)) continue
      seen.add(key)
      touches.push({ language: span.language, shortName: span.shortName, blockId: span.blockId })
    }
  }

  return touches
}

const formatTouch = (t: BlockTouch): string => {
  const blockRef = t.blockId ? ` "${t.blockId}"` : ""
  const targetRef = t.blockId ? ` to block "${t.blockId}"` : ""
  return `\`${t.language}\` block${blockRef} is read-only for this tool. Use \`patch_${t.shortName}\` or \`delete_${t.shortName}\` for targeted changes${targetRef}.`
}

export const formatBlockTouchErrors = (touches: BlockTouch[]): string =>
  touches.map(formatTouch).join("\n")
