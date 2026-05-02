import { z } from "zod"
import { callLlm, extractText, toResponseFormat } from "../../client"
import { processPool } from "~/lib/utils/pool"
import { noop } from "~/lib/utils/noop"
import {
  type ScopedSources,
  type ContentResolver,
  buildFindCall,
  buildFindResultSchema,
  buildSpanStepMessages,
  extractSourceIds,
  buildSourceTitleMap,
  REASON_CTA,
  REVIEW_CTA,
} from "./messages"
import {
  tallyVotes,
  filterByTally,
  groupBySpan,
  type FindResult,
  type CodedSpan,
} from "./consensus"
import { spanKey } from "./format"
import { formatCodedSection, type CodedItem } from "./present"

export type CallResult<T> = { ok: true; data: T } | { ok: false; error: string }

export interface DimensionResult {
  spans: FindResult[]
  errors: string[]
}

const countUniqueSentences = (spans: FindResult[]): number => {
  const seen = new Set<number>()
  for (const s of spans) {
    for (let i = s.start; i <= s.end; i++) seen.add(i)
  }
  return seen.size
}

const FIND_ENDPOINT = "/deep-analysis-find"
const REASON_ENDPOINT = "/deep-analysis-reason"
const REVIEW_ENDPOINT = "/deep-analysis-review"
const FIND_RUNS = 3
const FIND_THRESHOLD = 2
const SPAN_STEP_CONTEXT_SENTENCES = 6

const tryParseJson = (text: string): unknown | undefined => {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

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

const runFindRuns = async (
  messages: { type: "message"; role: "system" | "user"; content: string }[],
  schema: z.ZodType<{ results: FindResult[] }>
): Promise<{ runs: FindResult[][]; errors: string[] }> => {
  const errors: string[] = []
  const findSlots = Array.from({ length: FIND_RUNS }, (_, i) => i)
  const { results } = await processPool<number, FindResult[]>(
    findSlots,
    async () => {
      const result = await callAndParse(FIND_ENDPOINT, messages, schema)
      if (!result.ok) {
        errors.push(result.error)
        return []
      }
      return [result.data.results]
    },
    noop,
    { concurrency: 3, warmup: 1 }
  )
  return { runs: results, errors }
}

const isMultiCoded = (span: CodedSpan): boolean => span.codings.length > 1

const collectCodeIds = (spans: CodedSpan[]): Set<string> => {
  const ids = new Set<string>()
  for (const s of spans) for (const c of s.codings) ids.add(c)
  return ids
}

const toCodedItems = (spans: CodedSpan[]): CodedItem[] =>
  spans.map((s) => ({ start: s.start, end: s.end, codings: s.codings }))

const buildSpanStepSchema = (validCodes: string[]) =>
  z.object({
    results: z.array(
      z.object({
        id: z.number().int().min(1),
        code: validCodes.length > 0 ? z.enum(validCodes as [string, ...string[]]) : z.string(),
        justification: z.string(),
      })
    ),
  })

const runSpanStep = async (
  label: string,
  items: CodedSpan[],
  endpoint: string,
  cta: string,
  sentences: string[],
  sources: ScopedSources,
  leadingCtx: string,
  trailingCtx: string,
  resolve: ContentResolver
): Promise<{ values: Map<string, string>; error?: string }> => {
  if (items.length === 0) return { values: new Map() }

  const codeIds = collectCodeIds(items)
  const codedItems = toCodedItems(items)
  const { text: presented, mapping } = formatCodedSection(
    sentences,
    codedItems,
    SPAN_STEP_CONTEXT_SENTENCES
  )

  const messages = buildSpanStepMessages(
    presented,
    codeIds,
    sources,
    leadingCtx,
    trailingCtx,
    resolve,
    cta
  )

  const validCodes = [...codeIds]
  const schema = buildSpanStepSchema(validCodes)
  const result = await callAndParse(endpoint, messages, schema)

  if (!result.ok) {
    console.debug(`[deep-analysis] ${label} failed: ${result.error}`)
    return { values: new Map(), error: result.error }
  }

  const values = new Map<string, string>()
  for (const r of result.data.results) {
    const m = mapping.find((entry) => entry.index === r.id)
    if (!m) continue
    const key = spanKey(m.start, m.end, r.code)
    values.set(key, r.justification)
  }

  if (values.size > 0) {
    console.debug(`[deep-analysis] ${label}: ${values.size} span(s)`)
  }

  return { values }
}

export const runReasonStep = async (
  allSpans: FindResult[],
  sentences: string[],
  sources: ScopedSources,
  leadingCtx: string,
  trailingCtx: string,
  resolve: ContentResolver
): Promise<{ values: Map<string, string>; error?: string }> => {
  const grouped = groupBySpan(allSpans)
  return runSpanStep(
    "reason",
    grouped,
    REASON_ENDPOINT,
    REASON_CTA,
    sentences,
    sources,
    leadingCtx,
    trailingCtx,
    resolve
  )
}

export const runReviewStep = async (
  allSpans: FindResult[],
  sentences: string[],
  sources: ScopedSources,
  leadingCtx: string,
  trailingCtx: string,
  resolve: ContentResolver
): Promise<{ values: Map<string, string>; error?: string }> => {
  const grouped = groupBySpan(allSpans)
  const multiCoded = grouped.filter(isMultiCoded)
  if (multiCoded.length === 0) return { values: new Map() }
  return runSpanStep(
    "review",
    multiCoded,
    REVIEW_ENDPOINT,
    REVIEW_CTA,
    sentences,
    sources,
    leadingCtx,
    trailingCtx,
    resolve
  )
}

export const runDimensionPipeline = async (
  sources: ScopedSources,
  rawTarget: string,
  leadingCtx: string,
  trailingCtx: string,
  resolve: ContentResolver
): Promise<DimensionResult> => {
  const { messages: findMessages, sentences } = buildFindCall(
    rawTarget,
    sources,
    resolve,
    leadingCtx,
    trailingCtx
  )

  const validIds = extractSourceIds(sources, resolve)
  const findSchema = buildFindResultSchema(validIds)

  const { runs: findRuns, errors } = await runFindRuns(findMessages, findSchema)

  if (findRuns.length < FIND_RUNS) {
    console.debug(`[deep-analysis] consensus: ${findRuns.length}/${FIND_RUNS} runs (insufficient)`)
    return { spans: [], errors }
  }

  const tally = tallyVotes(findRuns, sentences.length)
  const spans = filterByTally(tally, FIND_THRESHOLD)

  const titles = buildSourceTitleMap(sources, resolve)
  const perCode = [...tally.entries()].map(([code, votesMap]) => {
    const voted = votesMap.size
    const survived = countUniqueSentences(spans.filter((s) => s.analysis_source_id === code))
    const name = titles.get(code) ?? code
    return `${name} ${voted}→${survived}`
  })
  console.debug(
    `[deep-analysis] consensus (${FIND_THRESHOLD}/${FIND_RUNS}): ${perCode.join(", ") || "no votes"}`
  )

  if (spans.length === 0) return { spans: [], errors }

  const codedSpans = groupBySpan(spans)
  for (const cs of codedSpans) {
    console.debug(`[deep-analysis]   [${cs.start}-${cs.end}] ${cs.codings.join(", ")}`)
  }

  return { spans, errors }
}

export const mergeDimensionResults = (results: DimensionResult[]) => {
  const allSpans: FindResult[] = []
  const errors: string[] = []

  for (const dr of results) {
    allSpans.push(...dr.spans)
    errors.push(...dr.errors)
  }

  return { allSpans, errors }
}
