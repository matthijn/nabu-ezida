import type { AsyncDuckDB } from "@duckdb/duckdb-wasm"
import type { QueryResult } from "./types"
import { DatabaseError } from "./types"

export const executeQuery = async <T = unknown>(
  db: AsyncDuckDB,
  sql: string
): Promise<QueryResult<T>> => {
  const conn = await db.connect()

  try {
    const result = await conn.query(sql)
    const rows = result.toArray().map(row => row.toJSON() as T)
    return { rows, rowCount: rows.length }
  } catch (cause) {
    throw new DatabaseError("query", `Query failed: ${sql}`, cause)
  } finally {
    await conn.close()
  }
}
