import type { Result } from "~/lib/fp/result"
import type { Database } from "~/lib/db/types"
import type { HydeQuery, HybridSearchPlan } from "./semantic"
import { ok, err } from "~/lib/fp/result"
import { fetchEmbeddings } from "~/lib/embeddings/client"
import { generateHydes, type HydeResult } from "./generate-hydes"
import { extractSemanticTokens, hasSemanticTokens, validateSql, buildHybridPlan } from "./semantic"

export type ResolvedQuery =
  | { type: "plain"; sql: string }
  | { type: "hybrid"; plan: HybridSearchPlan }

export interface SemanticContext {
  db: Database
  baseUrl: string
  description: string
}

const LANGUAGES_SQL = "SELECT DISTINCT language FROM files WHERE language IS NOT NULL"

interface LanguageRow {
  language: string
}

const fetchLanguages = async (db: Database): Promise<string[]> => {
  const result = await db.query<LanguageRow>(LANGUAGES_SQL)
  if (!result.ok) return []
  return result.value.rows.map((r) => r.language)
}

const flattenHydes = (hydeResult: HydeResult, vectors: number[][]): HydeQuery[] => {
  const entries: HydeQuery[] = []
  let idx = 0
  for (const [language, texts] of Object.entries(hydeResult)) {
    for (const text of texts) {
      entries.push({ text, language, cosineVector: vectors[idx++] })
    }
  }
  return entries
}

const collectAllTexts = (hydeResult: HydeResult): string[] => Object.values(hydeResult).flat()

export const resolveSemanticSql = async (
  sql: string,
  ctx: SemanticContext
): Promise<Result<ResolvedQuery, string>> => {
  const validation = validateSql(sql)
  if (!validation.ok) return err(validation.error)

  if (!hasSemanticTokens(sql)) return ok({ type: "plain", sql })

  const tokens = extractSemanticTokens(sql)
  const token = tokens[0]

  const languages = await fetchLanguages(ctx.db)
  if (languages.length === 0)
    return err("No languages detected in corpus. Embeddings may still be syncing.")

  const hydeResult = await generateHydes(ctx.description, languages, token.text)

  const allTexts = collectAllTexts(hydeResult)
  const embeddingResult = await fetchEmbeddings(allTexts, ctx.baseUrl)
  if (!embeddingResult.ok) return err(embeddingResult.error.message)

  const hydes = flattenHydes(hydeResult, embeddingResult.value)
  const plan = buildHybridPlan(sql, token, ctx.description, hydes)
  return ok({ type: "hybrid", plan })
}
