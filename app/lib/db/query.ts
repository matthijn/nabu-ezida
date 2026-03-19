import type { AsyncDuckDB } from "@duckdb/duckdb-wasm"
import { ok, err, type Result } from "~/lib/fp/result"
import type { DbError, QueryResult } from "./types"

const createDbError = (message: string, cause?: unknown): DbError => ({
  type: "query",
  message,
  cause,
})

export const executeQuery = async <T = unknown>(
  db: AsyncDuckDB,
  sql: string
): Promise<Result<QueryResult<T>, DbError>> => {
  const conn = await db.connect()

  try {
    const result = await conn.query(sql)
    const rows = result.toArray().map((row) => row.toJSON() as T)
    await conn.close()

    return ok({ rows, rowCount: rows.length })
  } catch (cause) {
    await conn.close()
    return err(createDbError(`Query failed: ${sql}`, cause))
  }
}
