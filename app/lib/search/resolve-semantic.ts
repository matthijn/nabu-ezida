import type { Result } from "~/lib/fp/result"
import { ok, err } from "~/lib/fp/result"
import { fetchEmbeddings } from "~/lib/embeddings/client"
import {
  extractSemanticTokens,
  rewriteSemanticSql,
  hasSemanticTokens,
  normalizeSemanticSql,
  validateSql,
} from "./semantic"

export const resolveSemanticSql = async (
  sql: string,
  baseUrl: string
): Promise<Result<string, string>> => {
  const validation = validateSql(sql)
  if (!validation.ok) return err(validation.error)

  if (!hasSemanticTokens(sql)) return ok(sql)

  const tokens = extractSemanticTokens(sql)
  const texts = tokens.map((t) => t.text)
  const result = await fetchEmbeddings(texts, baseUrl)
  if (!result.ok) return err(result.error.message)

  const rewritten = rewriteSemanticSql(sql, tokens, result.value)
  return ok(normalizeSemanticSql(rewritten))
}
