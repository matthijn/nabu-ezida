import type { z } from "zod"
import { callLlm, extractText, toResponseFormat } from "../../client"
import { processPool } from "~/lib/utils/pool"
import { noop } from "~/lib/utils/noop"
import {
  type ScopedSources,
  type ContentResolver,
  buildFindCall,
  buildFindResultSchema,
  extractSourceIds,
  buildSourceTitleMap,
} from "./messages"
import { tallyVotes, filterByTally, groupBySpan, type FindResult } from "./consensus"
import { spanKey } from "./format"

export type CallResult<T> = { ok: true; data: T } | { ok: false; error: string }

export interface DimensionResult {
  spans: FindResult[]
  reasons: Map<string, string>
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
// const REASON_ENDPOINT = "/deep-analysis-reason"
const FIND_RUNS = 4
const FIND_THRESHOLD = 3

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

const spansOverlap = (a: FindResult, b: FindResult): boolean =>
  a.analysis_source_id === b.analysis_source_id && a.start <= b.end && b.start <= a.end

const collectRunReasons = (spans: FindResult[], runs: FindResult[][]): Map<string, string> => {
  const reasons = new Map<string, string>()
  for (const span of spans) {
    const key = spanKey(span.start, span.end, span.analysis_source_id)
    const collected: string[] = []
    for (const run of runs) {
      for (const r of run) {
        if (!spansOverlap(span, r)) continue
        if (r.reason && !collected.includes(r.reason)) collected.push(r.reason)
      }
    }
    if (collected.length > 0) reasons.set(key, collected.join("\n"))
  }
  return reasons
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
    return { spans: [], reasons: new Map(), errors }
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

  if (spans.length === 0) return { spans: [], reasons: new Map(), errors }

  const codedSpans = groupBySpan(spans)
  for (const cs of codedSpans) {
    console.debug(`[deep-analysis]   [${cs.start}-${cs.end}] ${cs.codings.join(", ")}`)
  }

  const reasons = collectRunReasons(spans, findRuns)

  return { spans, reasons, errors }
}

export const mergeDimensionResults = (results: DimensionResult[]) => {
  const allSpans: FindResult[] = []
  const reasons = new Map<string, string>()
  const errors: string[] = []

  for (const dr of results) {
    allSpans.push(...dr.spans)
    for (const [k, v] of dr.reasons) reasons.set(k, v)
    errors.push(...dr.errors)
  }

  return { allSpans, reasons, errors }
}
