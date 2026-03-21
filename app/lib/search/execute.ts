import type { Database, DbError } from "~/lib/db/types"
import type { SearchQuery, SearchHit } from "~/domain/search"
import type { Result } from "~/lib/fp/result"
import { ok, err } from "~/lib/fp/result"

type RawRow = Record<string, unknown>

const FILE_COLUMNS = new Set(["file"])
const HIT_COLUMNS = new Set(["file", "id"])

const requiredColumns = (type: SearchQuery["type"]): Set<string> =>
  type === "file" ? FILE_COLUMNS : HIT_COLUMNS

const validateColumns = (row: RawRow, type: SearchQuery["type"]): Result<true, string> => {
  const required = requiredColumns(type)
  const missing = [...required].filter((col) => !(col in row))
  return missing.length === 0
    ? ok(true)
    : err(`Missing columns for type "${type}": ${missing.join(", ")}`)
}

const wrapRow = (row: RawRow, type: SearchQuery["type"]): SearchHit =>
  type === "file"
    ? { type: "file", file: String(row.file) }
    : { type: "hit", file: String(row.file), id: String(row.id) }

const hitKey = (hit: SearchHit): string => {
  switch (hit.type) {
    case "file":
      return `file:${hit.file}`
    case "hit":
      return `hit:${hit.file}:${hit.id}`
    case "text":
      return `text:${hit.file}:${hit.line}:${hit.term}`
  }
}

const deduplicateHits = (hits: SearchHit[]): SearchHit[] => {
  const seen = new Set<string>()
  return hits.filter((hit) => {
    const key = hitKey(hit)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const executeOneQuery = async (
  db: Database,
  query: SearchQuery
): Promise<Result<SearchHit[], DbError>> => {
  const result = await db.query<RawRow>(query.sql)
  if (!result.ok) return result

  const rows = result.value.rows
  if (rows.length === 0) return ok([])

  const colCheck = validateColumns(rows[0], query.type)
  if (!colCheck.ok) return err({ type: "query", message: colCheck.error })

  return ok(rows.map((row) => wrapRow(row, query.type)))
}

export const executeSearchQueries = async (
  db: Database,
  queries: SearchQuery[]
): Promise<Result<SearchHit[], DbError>> => {
  const allHits: SearchHit[] = []

  for (const query of queries) {
    const result = await executeOneQuery(db, query)
    if (!result.ok) return result
    allHits.push(...result.value)
  }

  return ok(deduplicateHits(allHits))
}
