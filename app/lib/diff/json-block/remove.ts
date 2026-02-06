import type { CodeBlock } from "~/domain/blocks/parse"
import { findBlocksByLanguage, parseBlockJson } from "~/domain/blocks/parse"

export type RemoveBlockResult =
  | { ok: true; patch: string }
  | { ok: false; error: string }

const splitDocLines = (doc: string): string[] => doc.split("\n")

const findBlockLineRange = (lines: string[], block: CodeBlock): { start: number; end: number } => {
  const beforeBlock = lines.slice(0, lines.length).join("\n").slice(0, block.start)
  const startLine = beforeBlock.split("\n").length - 1
  const blockText = lines.join("\n").slice(block.start, block.end)
  const blockLineCount = blockText.split("\n").length
  return { start: startLine, end: startLine + blockLineCount }
}

const trimBlankLines = (start: number, end: number, lines: string[]): { start: number; end: number } => {
  let s = start
  let e = end
  if (s > 0 && lines[s - 1].trim() === "") s--
  if (e < lines.length && lines[e].trim() === "") e++
  return { start: s, end: e }
}

const CONTEXT_LINES = 2

const buildRemovalPatch = (lines: string[], start: number, end: number): string => {
  const ctxBefore = lines.slice(Math.max(0, start - CONTEXT_LINES), start)
  const removed = lines.slice(start, end)
  const ctxAfter = lines.slice(end, Math.min(lines.length, end + CONTEXT_LINES))

  const parts: string[] = ["@@"]
  parts.push(...ctxBefore)
  parts.push(...removed.map((l) => "-" + l))
  parts.push(...ctxAfter)

  return parts.join("\n")
}

const findBlockById = (blocks: CodeBlock[], id: string): CodeBlock | undefined =>
  blocks.find((b) => {
    const json = parseBlockJson<Record<string, unknown>>(b)
    return json !== null && json.id === id
  })

export const generateBlockRemovalDiff = (
  docContent: string,
  language: string,
  id?: string
): RemoveBlockResult => {
  const blocks = findBlocksByLanguage(docContent, language)

  if (blocks.length === 0) return { ok: false, error: `No \`${language}\` block found` }

  const block = id !== undefined
    ? findBlockById(blocks, id)
    : blocks.length === 1 ? blocks[0] : undefined

  if (!block && id !== undefined) return { ok: false, error: `No \`${language}\` block with id "${id}"` }
  if (!block) return { ok: false, error: `Multiple \`${language}\` blocks found, provide an id to disambiguate` }

  const lines = splitDocLines(docContent)
  const { start, end } = findBlockLineRange(lines, block)
  const trimmed = trimBlankLines(start, end, lines)
  const patch = buildRemovalPatch(lines, trimmed.start, trimmed.end)

  return { ok: true, patch }
}
