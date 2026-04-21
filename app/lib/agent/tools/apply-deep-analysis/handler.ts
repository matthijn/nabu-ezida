import { z } from "zod"
import type { HandlerResult } from "../../types"
import {
  ApplyDeepAnalysisArgs,
  applyDeepAnalysisTool,
  type PostAction,
  type SourceFile,
} from "./def"
import { registerTool, tool } from "../../executors/tool"
import { callLlm, extractText, toResponseFormat } from "../../client"
import { getFileView, getViewableFiles } from "../file-view"
import { getFile } from "~/lib/files"
import { getToolHandlers } from "../../executors/tool"
import { processPool } from "~/lib/utils/pool"
import {
  CONTEXT_OVERLAP_RATIO,
  extractSection,
  extractLeadingContext,
  numberSection,
  mapResults,
  toAnnotationOps,
  formatReturnOutput,
  formatAnnotateOutput,
  isAnnotateAction,
  type AnalysisResult,
} from "./format"

const DEEP_ANALYSIS_ENDPOINT = "/deep-analysis"

const BaseResultSchema = z.object({
  start: z.number().int().min(1),
  end: z.number().int().min(1),
  analysis_source_id: z.string(),
  reason: z.string(),
})

const ReviewableResultSchema = BaseResultSchema.extend({
  review: z.string().nullish().describe("Flag for human review — explain what needs attention"),
})

const buildResponseSchema = (postAction: PostAction) =>
  z.object({
    results: z.array(postAction === "annotate_as_code" ? ReviewableResultSchema : BaseResultSchema),
  })

const REVIEW_GUIDANCE = [
  "When applying codes, flag an annotation for review if:",
  "- The passage fits but uneasily (stretched definition, partial match)",
  "- The passage is relevant to the codebook's themes but no existing code fits cleanly",
  "",
  'Flag sparingly. A flag means "this is a genuine codebook question worth the researcher\'s attention." Within any 20-60 line section, most annotations should not be flagged. If several are, the bar is too low — reconsider before flagging.',
  "",
  "Don't force-fit a wrong code, but also don't flag every imperfect fit. Apply the best-fitting code confidently when it's the right call; flag only when the fit itself raises a methodological question.",
].join("\n")

interface ScopedSources {
  framework: string[]
  dimension: string[]
}

const partitionSources = (files: SourceFile[]): ScopedSources => ({
  framework: files.filter((f) => f.scope === "framework").map((f) => f.path),
  dimension: files.filter((f) => f.scope === "dimension").map((f) => f.path),
})

const buildCallList = ({ framework, dimension }: ScopedSources): ScopedSources[] =>
  dimension.length === 0
    ? [{ framework, dimension: [] }]
    : dimension.map((p) => ({ framework, dimension: [p] }))

const formatSourceTag = (path: string, scope: string): string | undefined => {
  const content = getFileView(path)
  if (content === undefined) return undefined
  return `<source type="${scope}" path="${path}">\n${content}\n</source>`
}

const buildSourceMessage = ({ framework, dimension }: ScopedSources): string => {
  const frameworkTags = framework.flatMap((p) => formatSourceTag(p, "framework") ?? [])
  const dimensionTags = dimension.flatMap((p) => formatSourceTag(p, "dimension") ?? [])
  const parts = [...frameworkTags]
  if (frameworkTags.length > 0 && dimensionTags.length > 0) parts.push("---")
  parts.push(...dimensionTags)
  return parts.join("\n\n")
}

const buildSectionMessage = (numbered: string): string => `<section>\n${numbered}\n</section>`

const buildContextMessage = (context: string): string =>
  `<context type="preceding">\n${context}\n</context>`

const buildMessages = (
  numbered: string,
  sources: ScopedSources,
  postAction: PostAction,
  leadingContext: string
) => {
  const messages: { type: "message"; role: "system" | "user"; content: string }[] = [
    { type: "message", role: "system", content: buildSourceMessage(sources) },
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

type AnalysisParseResult =
  | { ok: true; results: AnalysisResult[]; failed: number }
  | { ok: false; error: string }

const parseResultItems = (
  rawItems: unknown[],
  itemSchema: z.ZodType
): { results: AnalysisResult[]; failed: number } => {
  let failed = 0
  const results: AnalysisResult[] = []
  for (const item of rawItems) {
    const parsed = itemSchema.safeParse(item)
    if (!parsed.success) {
      failed++
      continue
    }
    results.push(parsed.data as AnalysisResult)
  }
  return { results, failed }
}

const tryParseJson = (text: string): unknown | undefined => {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

const RawResultsWrapper = z.object({ results: z.array(z.unknown()) })

const runAnalysis = async (
  numbered: string,
  sources: ScopedSources,
  postAction: PostAction,
  leadingContext: string
): Promise<AnalysisParseResult> => {
  const blocks = await callLlm({
    endpoint: DEEP_ANALYSIS_ENDPOINT,
    messages: buildMessages(numbered, sources, postAction, leadingContext),
    responseFormat: toResponseFormat(buildResponseSchema(postAction)),
  })

  const text = extractText(blocks)
  if (!text) return { ok: false, error: "LLM returned no text response" }

  const raw = tryParseJson(text)
  if (raw === undefined) return { ok: false, error: "LLM returned invalid JSON" }

  const wrapper = RawResultsWrapper.safeParse(raw)
  if (!wrapper.success) return { ok: false, error: "LLM response missing results array" }

  const itemSchema = postAction === "annotate_as_code" ? ReviewableResultSchema : BaseResultSchema
  const { results, failed } = parseResultItems(wrapper.data.results, itemSchema)

  return { ok: true, results, failed }
}

const withParseFailures = (
  result: HandlerResult<string>,
  valid: number,
  failed: number
): HandlerResult<string> => {
  if (failed === 0) return result
  if (result.status === "error") return result
  return {
    ...result,
    status: "partial",
    message: `${valid}/${valid + failed} results passed schema validation`,
  }
}

const applyAnnotations = async (
  path: string,
  ops: { op: string; item: unknown }[]
): Promise<HandlerResult<string>> => {
  const handler = getToolHandlers()["patch_annotations"]
  if (!handler)
    return { status: "error", output: "patch_annotations handler not registered", mutations: [] }

  const files = getViewableFiles()
  const result = await handler(files, { path, operations: ops })

  if (result.status === "error")
    return { status: "error", output: String(result.output), mutations: [] }

  return { status: result.status, output: String(result.output), mutations: result.mutations }
}

registerTool(
  tool({
    ...applyDeepAnalysisTool,
    schema: ApplyDeepAnalysisArgs,
    handler: async (_files, { path, start_line, end_line, source_files, post_action }) => {
      if (getFile(path) === undefined)
        return { status: "error", output: `File not found: ${path}`, mutations: [] }

      const missingPaths = source_files
        .filter((f) => getFile(f.path) === undefined)
        .map((f) => f.path)
      if (missingPaths.length > 0)
        return {
          status: "error",
          output: `Source files not found: ${missingPaths.join(", ")}`,
          mutations: [],
        }

      const content = getFileView(path)
      if (content === undefined)
        return { status: "error", output: `Cannot read file: ${path}`, mutations: [] }

      const contentLines = content.split("\n")
      const findNonBlank = (from: number, dir: 1 | -1): string => {
        for (let j = from; j >= 0 && j < contentLines.length; j += dir) {
          if (contentLines[j].trim()) return contentLines[j]
        }
        return ""
      }
      const firstLine = contentLines[start_line - 1] ?? ""
      const lastLine = contentLines[end_line - 1] ?? ""
      const first = firstLine.trim()
        ? firstLine
        : `(blank, first after: ${findNonBlank(start_line, 1)})`
      const last = lastLine.trim()
        ? lastLine
        : `(blank, last before: ${findNonBlank(end_line - 2, -1)})`
      console.debug(`[deep-analysis] ${path} [${start_line}-${end_line}]`)
      console.debug(`[deep-analysis]   first: ${first}`)
      console.debug(`[deep-analysis]   last:  ${last}`)
      const section = extractSection(content, start_line, end_line)
      const leadingContext = extractLeadingContext(content, start_line, CONTEXT_OVERLAP_RATIO)
      const { sentences, numbered } = numberSection(section)

      if (sentences.length === 0)
        return { status: "ok", output: "Section contains no sentences.", mutations: [] }

      const scoped = partitionSources(source_files)
      const calls = buildCallList(scoped)
      const callErrors: string[] = []

      interface CallOutcome {
        results: AnalysisResult[]
        parseFailures: number
      }

      const { results: outcomes } = await processPool<ScopedSources, CallOutcome>(
        calls,
        async (sources) => {
          const outcome = await runAnalysis(numbered, sources, post_action, leadingContext)
          if (!outcome.ok) {
            callErrors.push(outcome.error)
            return []
          }
          return [{ results: outcome.results, parseFailures: outcome.failed }]
        },
        () => undefined,
        { concurrency: 5 }
      )

      if (outcomes.length === 0 && calls.length > 0)
        return { status: "error", output: callErrors.join("; "), mutations: [] }

      const validResults = outcomes.flatMap((o) => o.results)
      const parseFailures = outcomes.reduce((sum, o) => sum + o.parseFailures, 0)
      const mapped = mapResults(sentences, validResults)

      if (post_action === "return") {
        return withParseFailures(
          { status: "ok", output: formatReturnOutput(mapped), mutations: [] },
          validResults.length,
          parseFailures
        )
      }

      if (!isAnnotateAction(post_action)) {
        throw new Error(`unknown post_action: ${post_action}`)
      }

      if (mapped.length === 0) {
        if (parseFailures > 0 && validResults.length === 0)
          return {
            status: "error",
            output: `All ${parseFailures} results failed schema validation`,
            mutations: [],
          }
        return withParseFailures(
          { status: "ok", output: formatAnnotateOutput(mapped, post_action), mutations: [] },
          validResults.length,
          parseFailures
        )
      }

      const ops = toAnnotationOps(mapped, post_action)
      const annotationResult = await applyAnnotations(path, ops)
      if (annotationResult.status === "error") return annotationResult

      return withParseFailures(
        {
          status: "ok",
          output: formatAnnotateOutput(mapped, post_action),
          mutations: annotationResult.mutations,
        },
        validResults.length,
        parseFailures
      )
    },
  })
)
