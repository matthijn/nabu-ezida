import { z } from "zod"
import type { SearchHit } from "~/domain/search"
import { callLlm, extractText, toResponseFormat } from "~/lib/agent/client"
import { buildKey, tryGet, tryPut } from "~/lib/utils/storage-cache"

export const FILTER_BATCH_SIZE = 10

const SEMANTIC_FILTER_ENDPOINT = "/semantic-filter"
const SENTENCE_SPLIT_RE = /(?<=[.!?])\s+|\n+/
const MIN_WORD_COUNT = 3
const WORD_SPLIT_RE = /\s+/

const hasEnoughWords = (text: string): boolean => text.split(WORD_SPLIT_RE).length >= MIN_WORD_COUNT

const toSystem = (content: string) => ({
  type: "message" as const,
  role: "system" as const,
  content,
})

const FILTER_CALL_TO_ACTION =
  "Return the 1-based sentence numbers that match the intent, grouped into contiguous sequences."

export const splitSentences = (text: string): string[] =>
  text.split(SENTENCE_SPLIT_RE).filter((s) => s.length > 0)

export const formatNumberedPassage = (sentences: string[]): string =>
  sentences.map((s, i) => `${i + 1}: ${s}`).join("\n")

export const toLetter = (index: number): string => {
  let result = ""
  let n = index
  do {
    result = String.fromCharCode(97 + (n % 26)) + result
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return result
}

export const reconstructHits = (
  sentences: string[],
  groups: number[][],
  file: string,
  id?: string
): SearchHit[] => {
  const hits: SearchHit[] = []
  for (const indices of groups) {
    const text = indices
      .filter((i) => i >= 1 && i <= sentences.length)
      .map((i) => sentences[i - 1])
      .join(" ")
      .trim()
    if (hasEnoughWords(text)) hits.push({ file, ...(id !== undefined ? { id } : {}), text })
  }
  return hits
}

interface PreparedHit {
  hit: SearchHit
  sentences: string[]
  label: string
  numbered: string
}

const prepareHit = (hit: SearchHit, index: number): PreparedHit | null => {
  if (!hit.text) return null
  const sentences = splitSentences(hit.text)
  if (sentences.length === 0) return null
  const label = toLetter(index)
  return { hit, sentences, label, numbered: formatNumberedPassage(sentences) }
}

const buildBatchSchema = (labels: string[]) =>
  z.object(
    Object.fromEntries(labels.map((label) => [label, z.array(z.array(z.number().int().min(1)))]))
  )

const formatBatchPassage = (prepared: PreparedHit[]): string =>
  prepared.map((p) => `[${p.label}]\n${p.numbered}`).join("\n\n")

const callSemanticFilterBatch = async (
  intent: string,
  prepared: PreparedHit[]
): Promise<Record<string, number[][]>> => {
  const labels = prepared.map((p) => p.label)
  const schema = buildBatchSchema(labels)

  const blocks = await callLlm({
    endpoint: SEMANTIC_FILTER_ENDPOINT,
    messages: [
      toSystem(intent),
      toSystem(formatBatchPassage(prepared)),
      toSystem(FILTER_CALL_TO_ACTION),
    ],
    responseFormat: toResponseFormat(schema),
  })

  const text = extractText(blocks)
  if (!text) return {}

  const parsed = schema.safeParse(JSON.parse(text))
  return parsed.success ? parsed.data : {}
}

const FILTER_CACHE_PREFIX = "filter"
const FILTER_CACHE_CAP = 20_000

const cachedCallSemanticFilterBatch = async (
  intent: string,
  prepared: PreparedHit[]
): Promise<Record<string, number[][]>> => {
  const key = buildKey([intent, ...prepared.map((p) => p.numbered)])
  const cached = await tryGet<Record<string, number[][]>>(FILTER_CACHE_PREFIX, key)
  if (cached !== undefined) return cached
  const result = await callSemanticFilterBatch(intent, prepared)
  await tryPut(FILTER_CACHE_PREFIX, key, result, FILTER_CACHE_CAP)
  return result
}

const reconstructBatchHits = (
  prepared: PreparedHit[],
  results: Record<string, number[][]>
): SearchHit[] =>
  prepared.flatMap((p) => {
    const groups = results[p.label]
    if (!groups || groups.length === 0) return []
    return reconstructHits(p.sentences, groups, p.hit.file, p.hit.id)
  })

export const filterBatch = async (
  hits: SearchHit[],
  intent: string,
  skipCache = false
): Promise<SearchHit[]> => {
  const prepared = hits.map(prepareHit).filter((p): p is PreparedHit => p !== null)
  if (prepared.length === 0) return hits.filter((h) => !h.text)

  try {
    const call = skipCache ? callSemanticFilterBatch : cachedCallSemanticFilterBatch
    const results = await call(intent, prepared)
    const passThrough = hits.filter((h) => !h.text)
    return [...passThrough, ...reconstructBatchHits(prepared, results)]
  } catch (e) {
    console.error("[FILTER] batch failed", e)
    return []
  }
}
