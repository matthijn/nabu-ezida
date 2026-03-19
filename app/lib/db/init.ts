import * as duckdb from "@duckdb/duckdb-wasm"
import { ok, err, type Result } from "~/lib/fp/result"
import type { DbError, Database } from "./types"
import { executeQuery } from "./query"

import duckdb_wasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url"
import mvp_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url"
import duckdb_wasm_eh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url"
import eh_worker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url"

const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
  mvp: {
    mainModule: duckdb_wasm,
    mainWorker: mvp_worker,
  },
  eh: {
    mainModule: duckdb_wasm_eh,
    mainWorker: eh_worker,
  },
}

const createDbError = (type: DbError["type"], message: string, cause?: unknown): DbError => ({
  type,
  message,
  cause,
})

const initDuckDb = async (): Promise<Result<duckdb.AsyncDuckDB, DbError>> => {
  try {
    const bundle = await duckdb.selectBundle(MANUAL_BUNDLES)
    if (!bundle.mainWorker) return err(createDbError("init", "No worker bundle available"))
    const worker = new Worker(bundle.mainWorker)
    const logger = new duckdb.VoidLogger()
    const db = new duckdb.AsyncDuckDB(logger, worker)
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker)
    return ok(db)
  } catch (cause) {
    return err(createDbError("init", "Failed to initialize DuckDB", cause))
  }
}

const createTables = async (
  db: duckdb.AsyncDuckDB,
  ddl: string
): Promise<Result<void, DbError>> => {
  const conn = await db.connect()
  try {
    await conn.query(ddl)
    await conn.close()
    return ok(undefined)
  } catch (cause) {
    await conn.close()
    return err(createDbError("schema", "Failed to create tables", cause))
  }
}

export const initializeDatabase = async (ddl: string): Promise<Result<Database, DbError>> => {
  const dbResult = await initDuckDb()
  if (!dbResult.ok) return dbResult

  const instance = dbResult.value
  const tablesResult = await createTables(instance, ddl)
  if (!tablesResult.ok) return tablesResult

  const database: Database = {
    instance,
    query: <T = unknown>(sql: string) => executeQuery<T>(instance, sql),
  }

  return ok(database)
}
