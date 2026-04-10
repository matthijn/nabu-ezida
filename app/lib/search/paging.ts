export type LimitRewrite =
  | { kind: "unchanged"; sql: string; requested: number }
  | { kind: "injected"; sql: string; effective: number }
  | { kind: "shrunk"; sql: string; requested: number; effective: number }

export const LIMIT_RE = /\bLIMIT\s+(\d+)/i
export const OFFSET_RE = /\bOFFSET\s+\d+/i

export const extractLimit = (sql: string): number | undefined => {
  const match = sql.match(LIMIT_RE)
  return match ? parseInt(match[1], 10) : undefined
}

export const capLimit = (sql: string, max: number): LimitRewrite => {
  const requested = extractLimit(sql)
  if (requested === undefined) {
    const trimmed = sql.trimEnd().replace(/;\s*$/, "")
    return { kind: "injected", sql: `${trimmed} LIMIT ${max}`, effective: max }
  }
  if (requested <= max) {
    return { kind: "unchanged", sql, requested }
  }
  return {
    kind: "shrunk",
    sql: sql.replace(LIMIT_RE, `LIMIT ${max}`),
    requested,
    effective: max,
  }
}

export const hasOffset = (sql: string): boolean => OFFSET_RE.test(sql)

export const dropOffset = (sql: string): string => sql.replace(OFFSET_RE, "").trimEnd()

export const stripPaging = (sql: string): string =>
  sql.replace(LIMIT_RE, "").replace(OFFSET_RE, "").trimEnd()
