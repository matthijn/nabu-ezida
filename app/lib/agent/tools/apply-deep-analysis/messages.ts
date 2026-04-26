import { z } from "zod"
import type { PostAction, SourceFile } from "./def"

export interface ScopedSources {
  framework: string[]
  dimension: string[]
}

export const BaseResultSchema = z.object({
  start: z.number().int().min(1),
  end: z.number().int().min(1),
  analysis_source_id: z.string(),
  reason: z.string(),
})

export const ReviewableResultSchema = BaseResultSchema.extend({
  review: z.string().nullish().describe("Flag for human review — explain what needs attention"),
})

export const buildResponseSchema = (postAction: PostAction) =>
  z.object({
    results: z.array(postAction === "annotate_as_code" ? ReviewableResultSchema : BaseResultSchema),
  })

export const REVIEW_GUIDANCE = [
  "Review flag reminder:",
  "",
  "Include a review note only if this match fits uneasily — the definition was stretched to include this passage, or the span required an interpretive call another researcher might make differently.",
  "",
  'The bar is high. A flag means "this raises a question about how the definition handles borderline cases" — not "I\'m slightly unsure about this match." If you\'re slightly unsure, code confidently or drop; don\'t flag. Most matches should not have a review note.',
  "",
  "When flagging, the note is one sentence and actionable: tighten inclusion criterion X, clarify whether Y counts, this case sits between inclusion and exclusion criteria.",
  "",
  "Apply the best-fitting code confidently when it's the right call. Flag only when the fit itself raises a definition-boundary question.",
  "",
  "Span check: your reason must cover the whole span. If the reason only describes part of it, the span is too wide — tighten it.",
].join("\n")

export const partitionSources = (files: SourceFile[]): ScopedSources => ({
  framework: files.filter((f) => f.scope === "framework").map((f) => f.path),
  dimension: files.filter((f) => f.scope === "dimension").map((f) => f.path),
})

export const buildCallList = ({ framework, dimension }: ScopedSources): ScopedSources[] =>
  dimension.length === 0
    ? [{ framework, dimension: [] }]
    : dimension.map((p) => ({ framework, dimension: [p] }))

export type ContentResolver = (path: string) => string | undefined

const formatSourceTag = (content: string, path: string, scope: string): string =>
  `<source type="${scope}" path="${path}">\n${content}\n</source>`

export const buildSourceMessage = (
  { framework, dimension }: ScopedSources,
  resolve: ContentResolver
): string => {
  const toTag = (path: string, scope: string): string[] => {
    const content = resolve(path)
    return content !== undefined ? [formatSourceTag(content, path, scope)] : []
  }
  const frameworkTags = framework.flatMap((p) => toTag(p, "framework"))
  const dimensionTags = dimension.flatMap((p) => toTag(p, "dimension"))
  const parts = [...frameworkTags]
  if (frameworkTags.length > 0 && dimensionTags.length > 0) parts.push("---")
  parts.push(...dimensionTags)
  return parts.join("\n\n")
}

const buildSectionMessage = (numbered: string): string => `<section>\n${numbered}\n</section>`

const buildContextMessage = (context: string): string =>
  `<context type="preceding">\n${context}\n</context>`

export const buildMessages = (
  numbered: string,
  sources: ScopedSources,
  postAction: PostAction,
  leadingContext: string,
  resolve: ContentResolver
) => {
  const messages: { type: "message"; role: "system" | "user"; content: string }[] = [
    { type: "message", role: "system", content: buildSourceMessage(sources, resolve) },
  ]
  if (leadingContext) {
    messages.push({ type: "message", role: "system", content: buildContextMessage(leadingContext) })
  }
  messages.push({ type: "message", role: "system", content: buildSectionMessage(numbered) })
  if (postAction === "annotate_as_code") {
    messages.push({ type: "message", role: "system", content: REVIEW_GUIDANCE })
  }
  messages.push({
    type: "message",
    role: "user",
    content:
      "Analyze the numbered sentences against the source definitions. Return matching spans as JSON.",
  })
  return messages
}
