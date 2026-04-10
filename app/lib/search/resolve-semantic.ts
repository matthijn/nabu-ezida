import type { Result } from "~/lib/fp/result"
import type { Database } from "~/lib/db/types"
import type { HydeQuery, HybridSearchPlan } from "./semantic"
import { ok, err } from "~/lib/fp/result"
import { fetchEmbeddingBatch } from "~/lib/embeddings/client"
import { generateHydes, type HydeResult } from "./generate-hydes"
import { extractSemanticTokens, hasSemanticTokens, validateSql, buildHybridPlan } from "./semantic"

export type ResolvedQuery =
  | { type: "plain"; sql: string }
  | { type: "hybrid"; plan: HybridSearchPlan }

export type ResolveError =
  | { type: "invalid"; message: string }
  | { type: "not_ready"; message: string }

export interface SemanticContext {
  db: Database
  baseUrl: string
  tree: string
  skipCache?: boolean
}

const LANGUAGE_STATS_SQL = `
  SELECT language, COUNT(*) as cnt,
         COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as pct
  FROM files WHERE language IS NOT NULL
  GROUP BY language`

interface LanguageStatsRow {
  language: string
  cnt: number
  pct: number
}

const DEFAULT_LANGUAGE = "eng"
const SIGNIFICANCE_THRESHOLD = 10

export const filterSignificantLanguages = (
  rows: LanguageStatsRow[],
  threshold = SIGNIFICANCE_THRESHOLD
): string[] => {
  const significant = rows.filter((r) => r.pct > threshold).map((r) => r.language)
  if (!significant.includes(DEFAULT_LANGUAGE)) significant.push(DEFAULT_LANGUAGE)
  return significant
}

const fetchLanguages = async (db: Database): Promise<string[]> => {
  const result = await db.query<LanguageStatsRow>(LANGUAGE_STATS_SQL)
  if (!result.ok) return []
  return filterSignificantLanguages(result.value.rows)
}

const flattenHydes = (
  language: string,
  hydeResult: HydeResult,
  vectors: number[][]
): HydeQuery[] => {
  const entries: HydeQuery[] = []
  let idx = 0
  for (const [group, texts] of Object.entries(hydeResult)) {
    for (const text of texts) {
      entries.push({ text, language, group, cosineVector: vectors[idx++] })
    }
  }
  return entries
}

const collectAllTexts = (hydeResult: HydeResult): string[] => Object.values(hydeResult).flat()

const invalid = (message: string): Result<ResolvedQuery, ResolveError> =>
  err({ type: "invalid", message })

const notReady = (message: string): Result<ResolvedQuery, ResolveError> =>
  err({ type: "not_ready", message })

const generateAndEmbedForLanguage = async (
  tree: string,
  language: string,
  query: string,
  baseUrl: string,
  skipCache?: boolean
): Promise<Result<HydeQuery[], { message: string }>> => {
  const hydeResult = await generateHydes(tree, language, query, skipCache)
  const allTexts = collectAllTexts(hydeResult)
  if (allTexts.length === 0) return ok([])
  const embeddingResult = await fetchEmbeddingBatch(allTexts, baseUrl)
  if (!embeddingResult.ok) return err(embeddingResult.error)
  return ok(flattenHydes(language, hydeResult, embeddingResult.value))
}

export const resolveSemanticSql = async (
  sql: string,
  ctx: SemanticContext
): Promise<Result<ResolvedQuery, ResolveError>> => {
  const validation = validateSql(sql)
  if (!validation.ok) return invalid(validation.error)

  if (!hasSemanticTokens(sql)) return ok({ type: "plain", sql })

  const tokens = extractSemanticTokens(sql)
  const token = tokens[0]

  const languages = await fetchLanguages(ctx.db)
  if (languages.length === 0)
    return notReady("No languages detected in corpus. Embeddings may still be syncing.")

  const results = await Promise.all(
    languages.map((language) =>
      generateAndEmbedForLanguage(ctx.tree, language, token.text, ctx.baseUrl, ctx.skipCache)
    )
  )

  const allHydes: HydeQuery[] = []
  for (const result of results) {
    if (!result.ok) return invalid(result.error.message)
    allHydes.push(...result.value)
  }

  const plan = buildHybridPlan(sql, token, ctx.tree, allHydes)
  return ok({ type: "hybrid", plan })
}
