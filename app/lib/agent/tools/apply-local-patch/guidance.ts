import type { Operation, RawFiles } from "../../types"
import { parseCodeBlocks, type CodeBlock } from "~/lib/data-blocks/parse"
import { parseV4ADiff, buildMatchText } from "~/lib/patch/diff/parse"
import { findMatches } from "~/lib/patch/diff/search"

const CHART_LANGUAGE = "json-chart"
const CHART_GUIDANCE_KEY = "qual-coding/project/output"

interface CharRange {
  start: number
  end: number
}

const buildLineOffsets = (content: string): number[] => {
  const offsets = [0]
  for (let i = 0; i < content.length; i++) {
    if (content[i] === "\n") offsets.push(i + 1)
  }
  return offsets
}

const lineRangeToCharRange = (
  offsets: number[],
  startLine: number,
  endLine: number,
  total: number
): CharRange => ({
  start: offsets[startLine] ?? total,
  end: (offsets[endLine + 1] ?? total + 1) - 1,
})

const rangesOverlap = (a: CharRange, b: CharRange): boolean => a.start <= b.end && b.start <= a.end

const blockToRange = (block: CodeBlock): CharRange => ({ start: block.start, end: block.end })

const findChartBlocks = (markdown: string): CodeBlock[] =>
  parseCodeBlocks(markdown).filter((b) => b.language === CHART_LANGUAGE)

const hunkTouchesAnyChart = (
  fileContent: string,
  offsets: number[],
  chartRanges: CharRange[],
  hunkParts: ReturnType<typeof parseV4ADiff>[number]["parts"]
): boolean => {
  const matchText = buildMatchText(hunkParts)
  if (matchText === "") return false
  const matches = findMatches(fileContent, matchText)
  if (matches.length === 0) return false
  const m = matches[0]
  const range = lineRangeToCharRange(offsets, m.start, m.end, fileContent.length)
  return chartRanges.some((c) => rangesOverlap(range, c))
}

const updateTouchesChart = (fileContent: string, diff: string): boolean => {
  const charts = findChartBlocks(fileContent)
  if (charts.length === 0) return false
  const hunks = parseV4ADiff(diff)
  if (hunks.length === 0) return false
  const offsets = buildLineOffsets(fileContent)
  const chartRanges = charts.map(blockToRange)
  return hunks.some((h) => hunkTouchesAnyChart(fileContent, offsets, chartRanges, h.parts))
}

const buildAddText = (diff: string): string =>
  parseV4ADiff(diff)
    .flatMap((h) => h.parts)
    .filter((p) => p.type === "add")
    .map((p) => p.content)
    .join("")

const createTouchesChart = (diff: string): boolean => findChartBlocks(buildAddText(diff)).length > 0

export const requiresChartGuidance = (
  files: RawFiles,
  args: { operation: Operation }
): string[] => {
  const op = args.operation
  if (op.type === "update_file") {
    const content = files.get(op.path) ?? ""
    return updateTouchesChart(content, op.diff) ? [CHART_GUIDANCE_KEY] : []
  }
  if (op.type === "create_file") {
    return createTouchesChart(op.diff) ? [CHART_GUIDANCE_KEY] : []
  }
  return []
}
