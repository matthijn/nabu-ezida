import type { Result } from "~/lib/fp/result"
import { ok, err } from "~/lib/fp/result"

export interface SemanticToken {
  text: string
  start: number
  end: number
}

export interface AngleQuery {
  text: string
  cosineVector: number[]
}

export interface HybridSearchPlan {
  intent: string
  baseSql: string
  angles: AngleQuery[]
  limit: number
}

const SEMANTIC_PATTERN = /SEMANTIC\('([^']+)'\)/g
const SCORE_COLUMN = "_semantic_score"
const DEFAULT_LIMIT = 10

const OPERATOR_AFTER_SEMANTIC = /SEMANTIC\('[^']+'\)\s*(>|<|>=|<=|=|!=|<>)/
const AS_AFTER_SEMANTIC = /SEMANTIC\('[^']+'\)\s*AS\b/i
const SEMANTIC_IN_ORDER_BY = /ORDER\s+BY\s[\s\S]*?SEMANTIC\s*\(/i

const ORDER_BY_RE = /\bORDER\s+BY\s+/i
const LIMIT_RE = /\bLIMIT\s+(\d+)/i

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

const COSINE_IN_ERROR =
  /list_cosine_similarity\(embedding[^)\n]*(?:\)(?:\s*AS\s*_semantic_score)?)?/g

export const sanitizeSemanticError = (error: string): string =>
  error.replace(COSINE_IN_ERROR, "SEMANTIC(...)")

export const stripSemanticToken = (sql: string, token: SemanticToken): string => {
  const before = sql.slice(0, token.start)
  const after = sql.slice(token.end)
  const hasCommaBefore = /,\s*$/.test(before)
  const hasCommaAfter = /^\s*,/.test(after)
  if (hasCommaBefore && hasCommaAfter) {
    return before.replace(/,\s*$/, "") + after
  }
  if (hasCommaBefore) {
    return before.replace(/,\s*$/, "") + after
  }
  if (hasCommaAfter) {
    return before + after.replace(/^\s*,/, "")
  }
  return before + after
}

export const extractLimit = (sql: string): number => {
  const match = sql.match(LIMIT_RE)
  return match ? parseInt(match[1], 10) : DEFAULT_LIMIT
}

const stripOrderByAndLimit = (sql: string): string =>
  sql.replace(/\s*ORDER\s+BY\s+[\s\S]*$/i, "").replace(/\s*LIMIT\s+\d+/i, "")

const FROM_RE = /\bFROM\b/i

const injectSelectColumn = (sql: string, column: string): string => {
  const match = FROM_RE.exec(sql)
  if (!match) return `${sql}, ${column}`
  const beforeFrom = sql.slice(0, match.index)
  const fromOnward = sql.slice(match.index)
  return `${beforeFrom.trimEnd()}, ${column} ${fromOnward}`
}

export const buildCosineQuery = (baseSql: string, angle: AngleQuery): string => {
  const vec = formatVector(angle.cosineVector)
  const core = stripOrderByAndLimit(baseSql)
  const withColumn = injectSelectColumn(
    core,
    `list_cosine_similarity(embedding, ${vec}) AS ${SCORE_COLUMN}`
  )
  return `${withColumn} ORDER BY ${SCORE_COLUMN} DESC LIMIT 200`
}

export const uniqueWords = (texts: string[]): string =>
  [...new Set(texts.flatMap((t) => t.toLowerCase().split(/\s+/)))].join(" ")

const escapeSqlString = (value: string): string => value.replace(/'/g, "''")

export const buildBm25Query = (baseSql: string, searchTerms: string): string => {
  const core = stripOrderByAndLimit(baseSql)
  const withColumn = injectSelectColumn(
    core,
    `fts_main_files.match_bm25(hash, '${escapeSqlString(searchTerms)}') AS _bm25_score`
  )
  return `${withColumn} ORDER BY _bm25_score DESC LIMIT 200`
}

export const buildHybridPlan = (
  sql: string,
  token: SemanticToken,
  angles: AngleQuery[]
): HybridSearchPlan => {
  const baseSql = stripSemanticToken(sql, token)
  const limit = extractLimit(sql)
  return { intent: token.text, baseSql, angles, limit }
}

const aliasSemanticTokens = (sql: string, tokens: SemanticToken[]): string => {
  let result = ""
  let cursor = 0
  for (const token of tokens) {
    result += sql.slice(cursor, token.start)
    result += `SEMANTIC('${token.text}') AS ${SCORE_COLUMN}`
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
