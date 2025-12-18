import type { AsyncDuckDB } from "@duckdb/duckdb-wasm"

export type DbError = {
  type: "init" | "schema" | "sync" | "query"
  message: string
  cause?: unknown
}

export type QueryResult<T = unknown> = {
  rows: T[]
  rowCount: number
}

export type Database = {
  instance: AsyncDuckDB
  query: <T = unknown>(sql: string) => Promise<QueryResult<T>>
}

export class DatabaseError extends Error {
  type: DbError["type"]
  cause?: unknown

  constructor(type: DbError["type"], message: string, cause?: unknown) {
    super(message)
    this.name = "DatabaseError"
    this.type = type
    this.cause = cause
  }
}
