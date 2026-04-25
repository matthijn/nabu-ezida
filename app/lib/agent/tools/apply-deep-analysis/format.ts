import { splitSentences } from "~/lib/search/filter-hits"
import { formatNumberedPassage } from "~/lib/text/format"
import type { PostAction } from "./def"

export interface AnalysisResult {
  start: number
  end: number
  analysis_source_id: string
  reason: string
  review?: string | null
}

export interface MappedResult {
  text: string
  analysis_source_id: string
  reason: string
  review?: string
}

export const CONTEXT_OVERLAP_RATIO = 0.2

export const extractSection = (content: string, startLine: number, endLine: number): string => {
  const lines = content.split("\n")
  return lines.slice(startLine - 1, endLine).join("\n")
}

export const extractLeadingContext = (
  content: string,
  startLine: number,
  ratio: number
): string => {
  if (startLine <= 1) return ""
  const lines = content.split("\n")
  const preceding = lines.slice(0, startLine - 1)
  const totalChars = preceding.reduce((sum, l) => sum + l.length + 1, -1)
  const targetChars = Math.floor(totalChars * ratio)
  if (targetChars === 0) return ""

  let chars = 0
  for (let i = preceding.length - 1; i >= 0; i--) {
    chars += preceding[i].length + 1
    if (chars >= targetChars) return preceding.slice(i).join("\n").trim()
  }
  return preceding.join("\n").trim()
}

export const numberSection = (text: string): { sentences: string[]; numbered: string } => {
  const sentences = splitSentences(text)
  return { sentences, numbered: formatNumberedPassage(sentences) }
}

export const mapResults = (sentences: string[], results: AnalysisResult[]): MappedResult[] =>
  results.flatMap((r) => {
    const spans = sentences.slice(r.start - 1, r.end)
    if (spans.length === 0) return []
    const mapped: MappedResult = {
      text: spans.join(" "),
      analysis_source_id: r.analysis_source_id,
      reason: r.reason,
    }
    if (r.review) mapped.review = r.review
    return [mapped]
  })

interface AddAnnotationOp {
  op: "add_annotation"
  item: {
    text: string
    reason: string
    code?: string
    color?: string
    review?: string
  }
}

const DEFAULT_COMMENT_COLOR = "blue"

const toCodeAnnotation = (result: MappedResult): AddAnnotationOp => {
  const item: AddAnnotationOp["item"] = {
    text: result.text,
    reason: result.reason,
    code: result.analysis_source_id,
  }
  if (result.review) item.review = result.review
  return { op: "add_annotation", item }
}

const toCommentAnnotation = (result: MappedResult): AddAnnotationOp => ({
  op: "add_annotation",
  item: {
    text: result.text,
    reason: `[${result.analysis_source_id}] ${result.reason}`,
    color: DEFAULT_COMMENT_COLOR,
  },
})

const annotationBuilders: Record<
  "annotate_as_code" | "annotate_as_comment",
  (r: MappedResult) => AddAnnotationOp
> = {
  annotate_as_code: toCodeAnnotation,
  annotate_as_comment: toCommentAnnotation,
}

export const toAnnotationOps = (
  results: MappedResult[],
  action: "annotate_as_code" | "annotate_as_comment"
): AddAnnotationOp[] => results.map(annotationBuilders[action])

const formatResult = (r: MappedResult): string => {
  const base = `- [${r.analysis_source_id}] "${r.text}": ${r.reason}`
  return r.review ? `${base} [REVIEW: ${r.review}]` : base
}

const formatResults = (results: MappedResult[]): string => results.map(formatResult).join("\n")

export const ABSENCE_HINT = [
  "\n-----",
  "Absence is data. Report that nothing was found in this section.",
  "Do not speculate about why — the analysis was exhaustive.",
  "If the user asks why, re-examine the source definitions and section content.",
].join("\n")

const formatAbsence = (startLine: number, endLine: number, suffix: string): string =>
  `Lines ${startLine}-${endLine} analyzed. No matches found.${suffix}${ABSENCE_HINT}`

export const formatReturnOutput = (
  results: MappedResult[],
  startLine: number,
  endLine: number
): string => (results.length === 0 ? formatAbsence(startLine, endLine, "") : formatResults(results))

export const formatAnnotateOutput = (
  results: MappedResult[],
  action: "annotate_as_code" | "annotate_as_comment",
  startLine: number,
  endLine: number
): string => {
  if (results.length === 0) return formatAbsence(startLine, endLine, " No annotations written.")
  const kind = action === "annotate_as_code" ? "code" : "comment"
  return `${results.length} ${kind} annotation(s) written. Do not re-apply these.\n\n${formatResults(results)}`
}

export const isAnnotateAction = (
  action: PostAction
): action is "annotate_as_code" | "annotate_as_comment" =>
  action === "annotate_as_code" || action === "annotate_as_comment"
