import type { Result } from "~/lib/fp/result"
import type { AngleQuery, HybridSearchPlan } from "./semantic"
import { ok, err } from "~/lib/fp/result"
import { fetchEmbeddings } from "~/lib/embeddings/client"
import { generateLenses } from "./generate-lenses"
import { extractSemanticTokens, hasSemanticTokens, validateSql, buildHybridPlan } from "./semantic"

export type ResolvedQuery =
  | { type: "plain"; sql: string }
  | { type: "hybrid"; plan: HybridSearchPlan }

const toAngles = (lenses: string[], vectors: number[][]): AngleQuery[] =>
  lenses.map((text, i) => ({ text, cosineVector: vectors[i] }))

export const resolveSemanticSql = async (
  sql: string,
  baseUrl: string
): Promise<Result<ResolvedQuery, string>> => {
  const validation = validateSql(sql)
  if (!validation.ok) return err(validation.error)

  if (!hasSemanticTokens(sql)) return ok({ type: "plain", sql })

  const tokens = extractSemanticTokens(sql)
  const token = tokens[0]

  const lenses = await generateLenses(token.text)
  const embeddingResult = await fetchEmbeddings(lenses, baseUrl)
  if (!embeddingResult.ok) return err(embeddingResult.error.message)

  const angles = toAngles(lenses, embeddingResult.value)
  const plan = buildHybridPlan(sql, token, angles)
  return ok({ type: "hybrid", plan })
}
