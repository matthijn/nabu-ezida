import { splitSentences, formatNumberedPassage } from "~/lib/search/filter-hits"
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

export const extractSection = (content: string, startLine: number, endLine: number): string => {
  const lines = content.split("\n")
  return lines.slice(startLine - 1, endLine).join("\n")
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

export const formatReturnOutput = (results: MappedResult[]): string =>
  results.length === 0 ? "No matches found." : formatResults(results)

export const formatAnnotateOutput = (
  results: MappedResult[],
  action: "annotate_as_code" | "annotate_as_comment"
): string => {
  if (results.length === 0) return "No matches found. No annotations written."
  const kind = action === "annotate_as_code" ? "code" : "comment"
  return `${results.length} ${kind} annotation(s) written. Do not re-apply these.\n\n${formatResults(results)}`
}

export const isAnnotateAction = (
  action: PostAction
): action is "annotate_as_code" | "annotate_as_comment" =>
  action === "annotate_as_code" || action === "annotate_as_comment"
