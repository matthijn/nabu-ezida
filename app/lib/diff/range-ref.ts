import { findMatches, getMatchedText, type Match } from "./search"
import { expandMatch, countLines } from "./context"

export type RangeRefResult =
  | { ok: true; patch: string }
  | { ok: false; error: string }

export type FileReader = (path: string) => string | undefined

type RefHeader = { prefix: "+" | "-"; file: string | undefined }

type CollectedBody =
  | { ok: true; startAnchor: string; endAnchor: string; consumed: number }
  | { ok: false; error: string; consumed: number }

type ResolvedRange =
  | { ok: true; text: string }
  | { ok: false; error: string }

const REF_HEADER_RE = /^([+-])<<\s*(.*)$/

const CONTEXT_LINES = 3

const parseRefHeader = (line: string): RefHeader | undefined => {
  const m = line.match(REF_HEADER_RE)
  if (!m) return undefined
  const file = m[2].trim()
  return { prefix: m[1] as "+" | "-", file: file || undefined }
}

const isRefBodyLine = (line: string, prefix: string): boolean =>
  line.length >= 3 && line[0] === prefix && line[1] === " " && line[2] === " "

const collectRefBody = (lines: string[], start: number, prefix: string): CollectedBody => {
  const bodyLines: string[] = []
  let i = start
  while (i < lines.length && isRefBodyLine(lines[i], prefix)) {
    bodyLines.push(lines[i].slice(1).trim())
    i++
  }

  const consumed = i - start
  const ellipsisIdx = bodyLines.indexOf("...")
  if (ellipsisIdx === -1) return { ok: false, error: "range ref missing ... separator", consumed }
  if (ellipsisIdx === 0) return { ok: false, error: "range ref missing start anchor", consumed }
  if (ellipsisIdx === bodyLines.length - 1) return { ok: false, error: "range ref missing end anchor", consumed }

  return {
    ok: true,
    startAnchor: bodyLines.slice(0, ellipsisIdx).join("\n"),
    endAnchor: bodyLines.slice(ellipsisIdx + 1).join("\n"),
    consumed,
  }
}

const resolveRange = (content: string, startAnchor: string, endAnchor: string): ResolvedRange => {
  const startMatches = findMatches(content, startAnchor)
  if (startMatches.length === 0)
    return { ok: false, error: formatAnchorError("start", content, startAnchor, []) }
  if (startMatches.length > 1)
    return { ok: false, error: formatAnchorError("start", content, startAnchor, startMatches) }

  const startMatch = startMatches[0]
  const contentLines = content.split("\n")
  const suffix = contentLines.slice(startMatch.start).join("\n")
  const endMatches = findMatches(suffix, endAnchor)

  if (endMatches.length === 0)
    return { ok: false, error: formatAnchorError("end", content, endAnchor, []) }
  if (endMatches.length > 1) {
    const adjusted = endMatches.map((m) => ({
      ...m,
      start: m.start + startMatch.start,
      end: m.end + startMatch.start,
    }))
    return { ok: false, error: formatAnchorError("end", content, endAnchor, adjusted) }
  }

  const rangeEnd = startMatch.start + endMatches[0].end
  return { ok: true, text: contentLines.slice(startMatch.start, rangeEnd + 1).join("\n") }
}

const expandToLines = (text: string, prefix: string): string[] =>
  text.split("\n").map((line) => prefix + line)

const formatAnchorError = (
  which: "start" | "end",
  content: string,
  anchor: string,
  matches: Match[],
): string => {
  if (matches.length === 0)
    return `${which} anchor not found:\n  searching for: "${anchor}"`

  const total = countLines(content)
  const expanded = matches.map((m, i) => {
    const exp = expandMatch(m, CONTEXT_LINES, total)
    const text = getMatchedText(content, exp)
    return `Match ${i + 1}:\n───\n${text}\n───`
  })

  return [
    `${which} anchor ambiguous: ${matches.length} matches found`,
    "",
    ...expanded,
    "",
    "Include more anchor lines to disambiguate.",
  ].join("\n")
}

export const expandRangeRefs = (
  patch: string,
  readFile: FileReader,
  currentPath: string,
): RangeRefResult => {
  const lines = patch.split("\n")
  const output: string[] = []
  let i = 0

  while (i < lines.length) {
    const header = parseRefHeader(lines[i])
    if (!header) {
      output.push(lines[i])
      i++
      continue
    }

    i++
    const body = collectRefBody(lines, i, header.prefix)
    i += body.consumed

    if (!body.ok) return { ok: false, error: body.error }

    const filePath = header.file ?? currentPath
    const content = readFile(filePath)
    if (content === undefined) return { ok: false, error: `file not found: ${filePath}` }

    const range = resolveRange(content, body.startAnchor, body.endAnchor)
    if (!range.ok) return range

    output.push(...expandToLines(range.text, header.prefix))
  }

  return { ok: true, patch: output.join("\n") }
}
