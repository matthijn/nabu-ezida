import * as duckdb from "@duckdb/duckdb-wasm"
import type { Database } from "./types"
import { DatabaseError } from "./types"
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

const initializeDuckDb = async (): Promise<duckdb.AsyncDuckDB> => {
  try {
    const bundle = await duckdb.selectBundle(MANUAL_BUNDLES)
    const worker = new Worker(bundle.mainWorker!)
    const logger = new duckdb.VoidLogger()
    const db = new duckdb.AsyncDuckDB(logger, worker)
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker)
    return db
  } catch (cause) {
    throw new DatabaseError("init", "Failed to initialize DuckDB", cause)
  }
}

export const createTables = async (
  db: duckdb.AsyncDuckDB,
  sql: string
): Promise<void> => {
  const conn = await db.connect()

  try {
    await conn.query(sql)
  } catch (cause) {
    throw new DatabaseError("schema", "Failed to create tables", cause)
  } finally {
    await conn.close()
  }
}

export const initializeDatabase = async (schemaSql: string): Promise<Database> => {
  const db = await initializeDuckDb()
  await createTables(db, schemaSql)

  return {
    instance: db,
    query: <T = unknown>(sql: string) => executeQuery<T>(db, sql),
  }
}
