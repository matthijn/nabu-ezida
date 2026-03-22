import type { Database, DbError } from "~/lib/db/types"
import type { SearchHit } from "~/domain/search"
import type { Result } from "~/lib/fp/result"
import { ok, err } from "~/lib/fp/result"

type RawRow = Record<string, unknown>

const hasFileColumn = (row: RawRow): boolean => "file" in row

const toHit = (row: RawRow): SearchHit => ({
  file: String(row.file),
  ...(row.id !== undefined ? { id: String(row.id) } : {}),
  ...(row.text !== undefined ? { text: String(row.text) } : {}),
})

export const executeSearch = async (
  db: Database,
  sql: string
): Promise<Result<SearchHit[], DbError>> => {
  const result = await db.query<RawRow>(sql)
  if (!result.ok) return result

  const rows = result.value.rows
  if (rows.length === 0) return ok([])

  if (!hasFileColumn(rows[0])) {
    return err({ type: "query", message: "Query must SELECT a `file` column" })
  }

  return ok(rows.map(toHit))
}
