import type { z } from "zod"
import type { HandlerResult } from "../../types"
import { ApplyDeepAnalysisArgs, applyDeepAnalysisTool } from "./def"
import { registerTool, tool } from "../../executors/tool"
import { callLlm, extractText, toResponseFormat } from "../../client"
import { getFileView, getViewableFiles } from "../file-view"
import { getFile } from "~/lib/files"
import { processPool } from "~/lib/utils/pool"
import { getToolHandlers } from "../../executors/tool"
import { CONTEXT_OVERLAP_CHARS } from "~/lib/data-blocks/chunk-lines"
import {
  extractSection,
  extractLeadingContext,
  extractTrailingContext,
  prepareTargetContent,
  numberSection,
  mapResults,
  toAnnotationOps,
  formatReturnOutput,
  formatAnnotateOutput,
  isAnnotateAction,
  type AnalysisResult,
} from "./format"
import {
  type ScopedSources,
  type ContentResolver,
  partitionSources,
  buildCallList,
  buildFindCall,
  buildReasonMessages,
  buildReviewMessages,
  FindResultSchema,
  ReasonResultSchema,
  ReviewResultSchema,
} from "./messages"
import { dropOutlier, promoteSpans, type FindResult, type PromotedSpan } from "./consensus"
import { formatCodedSection, type CodedItem } from "./present"

const FIND_ENDPOINT = "/deep-analysis-find"
const REASON_ENDPOINT = "/deep-analysis-reason"
const REVIEW_ENDPOINT = "/deep-analysis-review"
const FIND_RUNS = 5
const VOTE_POOL = 4

const tryParseJson = (text: string): unknown | undefined => {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

type CallResult<T> = { ok: true; data: T } | { ok: false; error: string }

const callAndParse = async <T>(
  endpoint: string,
  messages: { type: "message"; role: "system" | "user"; content: string }[],
  schema: z.ZodType<T>
): Promise<CallResult<T>> => {
  const blocks = await callLlm({
    endpoint,
    messages,
    responseFormat: toResponseFormat(schema),
  })

  const text = extractText(blocks)
  if (!text) return { ok: false, error: "LLM returned no text response" }

  const raw = tryParseJson(text)
  if (raw === undefined) return { ok: false, error: "LLM returned invalid JSON" }

  const parsed = schema.safeParse(raw)
  if (!parsed.success)
    return { ok: false, error: `Schema validation failed: ${parsed.error.message}` }

  return { ok: true, data: parsed.data }
}

const toAnalysisResults = (
  spans: PromotedSpan[],
  reasons: Map<string, string>,
  reviews: Map<string, string>
): AnalysisResult[] =>
  spans.map((s) => {
    const key = `${s.start}-${s.end}-${s.analysis_source_id}`
    const result: AnalysisResult = {
      start: s.start,
      end: s.end,
      analysis_source_id: s.analysis_source_id,
      reason: reasons.get(key) ?? "",
    }
    const review = reviews.get(key)
    if (review) result.review = review
    return result
  })

const spanKey = (start: number, end: number, code: string): string => `${start}-${end}-${code}`

interface DimensionResult {
  spans: PromotedSpan[]
  reasons: Map<string, string>
  reviews: Map<string, string>
  errors: string[]
}

const runDimensionPipeline = async (
  sources: ScopedSources,
  rawTarget: string,
  leadingCtx: string,
  trailingCtx: string,
  resolve: ContentResolver,
  isCodeAction: boolean
): Promise<DimensionResult> => {
  const errors: string[] = []
  const reasons = new Map<string, string>()
  const reviews = new Map<string, string>()

  const { messages: findMessages, sentences } = buildFindCall(
    rawTarget,
    sources,
    resolve,
    leadingCtx,
    trailingCtx
  )

  const findSlots = Array.from({ length: FIND_RUNS }, (_, i) => i)
  const { results: findRuns } = await processPool<number, FindResult[]>(
    findSlots,
    async () => {
      const result = await callAndParse(FIND_ENDPOINT, findMessages, FindResultSchema)
      if (!result.ok) {
        errors.push(result.error)
        return []
      }
      return [result.data.results]
    },
    () => {
      /* no-op: processPool requires onResult */
    },
    { concurrency: 5, warmup: 1 }
  )

  if (findRuns.length < FIND_RUNS) return { spans: [], reasons, reviews, errors }

  const votingPool = dropOutlier(findRuns)
  const consensus = promoteSpans(votingPool, sentences.length, VOTE_POOL)
  const combinedSpans = [...consensus.certain, ...consensus.uncertain]
  if (combinedSpans.length === 0) return { spans: [], reasons, reviews, errors }

  const reasonItems: CodedItem[] = combinedSpans.map((s) => ({
    start: s.start,
    end: s.end,
    analysis_source_id: s.analysis_source_id,
  }))
  const { text: reasonPresented, mapping: reasonMapping } = formatCodedSection(
    sentences,
    reasonItems
  )

  const reasonResult = await callAndParse(
    REASON_ENDPOINT,
    buildReasonMessages(reasonPresented, sources, leadingCtx, trailingCtx, resolve),
    ReasonResultSchema
  )
  if (reasonResult.ok) {
    for (const r of reasonResult.data.results) {
      const m = reasonMapping.find((mm) => mm.index === r.item)
      if (m) reasons.set(spanKey(m.start, m.end, m.analysis_source_id), r.reason)
    }
  }

  const uncertainInDim = combinedSpans.filter((s) => s.tier === "uncertain")
  if (isCodeAction && uncertainInDim.length > 0) {
    const reviewItems: CodedItem[] = uncertainInDim.map((s) => ({
      start: s.start,
      end: s.end,
      analysis_source_id: s.analysis_source_id,
      reason: reasons.get(spanKey(s.start, s.end, s.analysis_source_id)),
    }))
    const { text: reviewPresented, mapping: reviewMapping } = formatCodedSection(
      sentences,
      reviewItems
    )

    const reviewResult = await callAndParse(
      REVIEW_ENDPOINT,
      buildReviewMessages(reviewPresented, sources, leadingCtx, trailingCtx, resolve),
      ReviewResultSchema
    )
    if (reviewResult.ok) {
      for (const r of reviewResult.data.results) {
        const m = reviewMapping.find((mm) => mm.index === r.item)
        if (m) reviews.set(spanKey(m.start, m.end, m.analysis_source_id), r.review)
      }
    }
  }

  return { spans: combinedSpans, reasons, reviews, errors }
}

const mergeDimensionResults = (results: DimensionResult[]) => {
  const allSpans: PromotedSpan[] = []
  const reasons = new Map<string, string>()
  const reviews = new Map<string, string>()
  const errors: string[] = []

  for (const dr of results) {
    allSpans.push(...dr.spans)
    for (const [k, v] of dr.reasons) reasons.set(k, v)
    for (const [k, v] of dr.reviews) reviews.set(k, v)
    errors.push(...dr.errors)
  }

  return { allSpans, reasons, reviews, errors }
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

      const rawSection = extractSection(content, start_line, end_line)
      const leadingCtx = prepareTargetContent(
        extractLeadingContext(content, start_line, CONTEXT_OVERLAP_CHARS)
      )
      const trailingCtx = prepareTargetContent(
        extractTrailingContext(content, end_line, CONTEXT_OVERLAP_CHARS)
      )
      const section = prepareTargetContent(rawSection)
      const { sentences } = numberSection(section)

      if (sentences.length === 0)
        return { status: "ok", output: "Section contains no sentences.", mutations: [] }

      const scoped = partitionSources(source_files)
      const calls = buildCallList(scoped)
      const resolve: ContentResolver = getFileView
      const isCodeAction = post_action === "annotate_as_code"

      const dimensionResults = await Promise.all(
        calls.map((sources) =>
          runDimensionPipeline(sources, rawSection, leadingCtx, trailingCtx, resolve, isCodeAction)
        )
      )

      const {
        allSpans,
        reasons,
        reviews,
        errors: findErrors,
      } = mergeDimensionResults(dimensionResults)

      if (allSpans.length === 0 && calls.length > 0 && findErrors.length > 0)
        return { status: "error", output: findErrors.join("; "), mutations: [] }

      const analysisResults = toAnalysisResults(allSpans, reasons, reviews)
      const mapped = mapResults(sentences, analysisResults)

      if (post_action === "return")
        return {
          status: "ok",
          output: formatReturnOutput(mapped, start_line, end_line),
          mutations: [],
        }

      if (!isAnnotateAction(post_action)) throw new Error(`unknown post_action: ${post_action}`)

      if (mapped.length === 0)
        return {
          status: "ok",
          output: formatAnnotateOutput(mapped, post_action, start_line, end_line),
          mutations: [],
        }

      const ops = toAnnotationOps(mapped, post_action)
      const annotationResult = await applyAnnotations(path, ops)
      if (annotationResult.status === "error") return annotationResult

      return {
        status: "ok",
        output: formatAnnotateOutput(mapped, post_action, start_line, end_line),
        mutations: annotationResult.mutations,
      }
    },
  })
)
