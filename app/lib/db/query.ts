import type { AsyncDuckDB } from "@duckdb/duckdb-wasm"
import { ok, err, type Result } from "~/lib/fp/result"
import type { DbError, QueryResult } from "./types"

export type RunSql = (sql: string) => Promise<Result<void, DbError>>

const extractMessage = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause)

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
    return err(createDbError(`Query failed: ${extractMessage(cause)}`, cause))
  }
}

export const executeWithConnection = async <T>(
  db: AsyncDuckDB,
  fn: (runSql: RunSql) => Promise<T>
): Promise<T> => {
  const conn = await db.connect()

  const runSql: RunSql = async (sql) => {
    try {
      await conn.query(sql)
      return ok(undefined)
    } catch (cause) {
      return err(createDbError(`Query failed: ${extractMessage(cause)}`, cause))
    }
  }

  try {
    return await fn(runSql)
  } finally {
    await conn.close()
  }
}
