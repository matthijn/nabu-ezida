import { parseV4ADiff, buildMatchText, type Hunk } from "~/lib/diff/parse"
import { findMatches } from "~/lib/diff/search"
import { buildLineZones, findJsonBlockSpans, type ZoneMap, type JsonBlockSpan, type LineZone } from "~/lib/diff/zone"

export type HintContext = { fileContent: string; diff: string }

type ClassifiedHunk = {
  zones: Set<LineZone>
  addLineCount: number
  isRangeRef: boolean
  spansCovered: JsonBlockSpan[]
}

const LARGE_HUNK_THRESHOLD = 20
const LARGE_BLOCK_THRESHOLD = 15

const HINT_JSON_STRUCTURE = "Use patch_json_block for JSON property changes — targets fields by path, no context matching needed."
const HINT_LARGE_BLOCK = "Use patch_json_block for property changes in large JSON blocks — more reliable than rewriting the whole block."
const HINT_LARGE_HUNK = "Split large patches into one per markdown block — smaller patches match more reliably."

export const detectHint = (ctx: HintContext): string | null => {
  if (!ctx.fileContent) return null

  const zones = buildLineZones(ctx.fileContent)
  const hunks = parseV4ADiff(ctx.diff)
  if (hunks.length === 0) return null

  const spans = findJsonBlockSpans(zones)
  const classified = hunks.map((h) => classifyHunk(h, ctx.fileContent, zones, spans))

  return detectWholeBlockHint(classified)
    ?? detectJsonStructureHint(classified)
    ?? detectLargeHunkHint(classified)
}

const classifyHunk = (hunk: Hunk, fileContent: string, zones: ZoneMap, spans: JsonBlockSpan[]): ClassifiedHunk => {
  const addParts = hunk.parts.filter((p) => p.type === "add")
  const addLineCount = addParts.reduce((sum, p) => sum + countNewlines(p.content), 0)
  const isRangeRef = addParts.some((p) => p.content.trimStart().startsWith("<<"))

  const hunkZones = getHunkZones(hunk, fileContent, zones)
  const spansCovered = findCoveredSpans(hunk, fileContent, zones, spans)

  return { zones: hunkZones, addLineCount, isRangeRef, spansCovered }
}

const countNewlines = (s: string): number => {
  let count = 0
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\n") count++
  }
  return count || 1
}

const getHunkZones = (hunk: Hunk, fileContent: string, zones: ZoneMap): Set<LineZone> => {
  const matchText = buildMatchText(hunk.parts)

  if (matchText === "") {
    const lastZone = zones.length > 0 ? zones[zones.length - 1] : "outside"
    return new Set([lastZone])
  }

  const matches = findMatches(fileContent, matchText)
  if (matches.length === 0) return new Set<LineZone>(["outside"])

  const match = matches[0]
  const touchedZones = new Set<LineZone>()
  for (let i = match.start; i <= match.end; i++) {
    if (i < zones.length) touchedZones.add(zones[i])
  }
  return touchedZones
}

const findCoveredSpans = (hunk: Hunk, fileContent: string, zones: ZoneMap, spans: JsonBlockSpan[]): JsonBlockSpan[] => {
  const matchText = buildMatchText(hunk.parts)
  if (matchText === "") return []

  const matches = findMatches(fileContent, matchText)
  if (matches.length === 0) return []

  const match = matches[0]
  return spans.filter((span) => match.start <= span.startLine && match.end >= span.endLine)
}

const touchesStructureOrMixed = (classified: ClassifiedHunk): boolean =>
  classified.zones.has("structure")

const detectJsonStructureHint = (classified: ClassifiedHunk[]): string | null => {
  const hasStructureEdit = classified.some((c) => !isPureAppendClassified(c) && touchesStructureOrMixed(c))
  return hasStructureEdit ? HINT_JSON_STRUCTURE : null
}

const isPureAppendClassified = (c: ClassifiedHunk): boolean =>
  c.zones.size === 1 && c.addLineCount > 0 && !c.zones.has("structure") && !c.zones.has("prose")

const detectWholeBlockHint = (classified: ClassifiedHunk[]): string | null => {
  const hasLargeBlockRewrite = classified.some((c) =>
    c.spansCovered.some((span) => span.lineCount > LARGE_BLOCK_THRESHOLD),
  )
  return hasLargeBlockRewrite ? HINT_LARGE_BLOCK : null
}

const detectLargeHunkHint = (classified: ClassifiedHunk[]): string | null => {
  const hasLargeHunk = classified.some((c) =>
    c.addLineCount > LARGE_HUNK_THRESHOLD && !c.isRangeRef,
  )
  return hasLargeHunk ? HINT_LARGE_HUNK : null
}
