import type { Result } from "~/lib/fp/result"
import { ok, err } from "~/lib/fp/result"

export interface SemanticToken {
  text: string
  start: number
  end: number
}

const SEMANTIC_PATTERN = /SEMANTIC\('([^']+)'\)/g
const SCORE_COLUMN = "_semantic_score"
const DEFAULT_LIMIT = 50

const OPERATOR_AFTER_SEMANTIC = /SEMANTIC\('[^']+'\)\s*(>|<|>=|<=|=|!=|<>)/
const AS_AFTER_SEMANTIC = /SEMANTIC\('[^']+'\)\s*AS\b/i
const SEMANTIC_IN_ORDER_BY = /ORDER\s+BY\s[\s\S]*?SEMANTIC\s*\(/i

const ORDER_BY_RE = /\bORDER\s+BY\s+/i
const LIMIT_RE = /\bLIMIT\s+\d+/i

const formatVector = (vector: number[]): string => `[${vector.join(",")}]`

export const extractSemanticTokens = (sql: string): SemanticToken[] => {
  const tokens: SemanticToken[] = []
  let match: RegExpExecArray | null
  while ((match = SEMANTIC_PATTERN.exec(sql)) !== null) {
    tokens.push({ text: match[1], start: match.index, end: match.index + match[0].length })
  }
  SEMANTIC_PATTERN.lastIndex = 0
  return tokens
}

export const hasSemanticTokens = (sql: string): boolean => {
  const result = SEMANTIC_PATTERN.test(sql)
  SEMANTIC_PATTERN.lastIndex = 0
  return result
}

export const validateSemanticSql = (sql: string, tokens: SemanticToken[]): string[] => {
  const errors: string[] = []
  if (tokens.length > 1)
    errors.push(
      "Multiple SEMANTIC() calls. Use one per query — the system ranks by similarity automatically."
    )
  if (OPERATOR_AFTER_SEMANTIC.test(sql))
    errors.push(
      "SEMANTIC() followed by comparison operator. Don't threshold similarity scores — the system ranks results automatically. Just write SEMANTIC('text') in the SELECT list."
    )
  if (AS_AFTER_SEMANTIC.test(sql))
    errors.push(
      "SEMANTIC() followed by AS alias. The system aliases it automatically. Just write SEMANTIC('text')."
    )
  if (SEMANTIC_IN_ORDER_BY.test(sql))
    errors.push(
      "SEMANTIC() inside ORDER BY. The system adds ORDER BY automatically. Only specify non-semantic ordering columns."
    )
  return errors
}

const MAX_ILIKE_CLAUSES = 3
const ILIKE_PATTERN = /\bILIKE\b/gi

export const countIlikeClauses = (sql: string): number => (sql.match(ILIKE_PATTERN) ?? []).length

export const validateSql = (sql: string): Result<void, string> => {
  const errors: string[] = []

  if (countIlikeClauses(sql) > MAX_ILIKE_CLAUSES)
    errors.push(
      "Too many ILIKE clauses. Use SEMANTIC('text') for meaning-based matching instead of listing keyword variants."
    )

  if (hasSemanticTokens(sql)) {
    const tokens = extractSemanticTokens(sql)
    errors.push(...validateSemanticSql(sql, tokens))
  }

  if (errors.length === 0) return ok(undefined)
  return err(errors.join("\n"))
}

export const rewriteSemanticSql = (
  sql: string,
  tokens: SemanticToken[],
  vectors: number[][]
): string => {
  let result = ""
  let cursor = 0

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    result += sql.slice(cursor, token.start)
    result += `list_cosine_similarity(embedding, ${formatVector(vectors[i])}) AS ${SCORE_COLUMN}`
    cursor = token.end
  }

  result += sql.slice(cursor)
  return result
}

const COSINE_IN_ERROR =
  /list_cosine_similarity\(embedding[^)\n]*(?:\)(?:\s*AS\s*_semantic_score)?)?/g

export const sanitizeSemanticError = (error: string): string =>
  error.replace(COSINE_IN_ERROR, "SEMANTIC(...)")

const aliasSemanticTokens = (sql: string, tokens: SemanticToken[]): string => {
  let result = ""
  let cursor = 0
  for (const token of tokens) {
    result += sql.slice(cursor, token.end)
    result += ` AS ${SCORE_COLUMN}`
    cursor = token.end
  }
  result += sql.slice(cursor)
  return result
}

export const formatDebugSql = (sql: string): string => {
  if (!hasSemanticTokens(sql)) return sql
  const tokens = extractSemanticTokens(sql)
  return normalizeSemanticSql(aliasSemanticTokens(sql, tokens))
}

export const normalizeSemanticSql = (sql: string): string => {
  let result = sql.trimEnd()
  const hasOrderBy = ORDER_BY_RE.test(result)
  const hasLimit = LIMIT_RE.test(result)

  if (hasOrderBy) {
    result = result.replace(ORDER_BY_RE, (match) => `${match}${SCORE_COLUMN} DESC, `)
  } else if (hasLimit) {
    result = result.replace(LIMIT_RE, (match) => `ORDER BY ${SCORE_COLUMN} DESC ${match}`)
  } else {
    result += ` ORDER BY ${SCORE_COLUMN} DESC`
  }

  if (!hasLimit) {
    result += ` LIMIT ${DEFAULT_LIMIT}`
  }

  return result
}
