import { subscribe, getFiles, type FileStore } from "~/lib/files/store"
import { getBlock, getBlocks } from "~/lib/data-blocks/query"
import { debounce } from "~/lib/utils/debounce"
import { initializeDatabase } from "~/lib/db/init"
import { computeSyncPlan, syncFiles, batchSyncPlan, type ProjectionWithSchema } from "~/lib/db/sync"
import { jsonSchemaToTableProjection, tableSchemaToDdl, filterHiddenColumns } from "~/lib/db/ddl"
import { projections, toJsonSchema } from "./projections"
import { startEmbeddings } from "~/domain/embeddings/init"
import type { Database } from "~/lib/db/types"

const buildProjectionsWithSchemas = (): ProjectionWithSchema[] =>
  projections.map((config) => {
    const jsonSchema = toJsonSchema(config)
    const { schemas } = jsonSchemaToTableProjection(config.tableName, jsonSchema)
    return { config, jsonSchema, schemas }
  })

const generateDdl = (withSchemas: ProjectionWithSchema[]): string =>
  withSchemas.flatMap((p) => p.schemas.map(tableSchemaToDdl)).join("\n\n")

const findProjectionSchema = (language: string) => {
  const projection = projections.find((p) => p.language === language)
  if (!projection) throw new Error(`Unknown projection language: ${language}`)
  return projection.schema
}

const getBlocksUntyped = (raw: string, language: string): Record<string, unknown>[] =>
  getBlocks(raw, language, findProjectionSchema(language)) as Record<string, unknown>[]

const getBlockUntyped = (raw: string, language: string): Record<string, unknown> | null =>
  getBlock(raw, language, findProjectionSchema(language)) as Record<string, unknown> | null

const FTS_STATEMENTS = [
  "INSTALL fts",
  "LOAD fts",
  "PRAGMA create_fts_index('files', 'hash', 'text', overwrite = 1)",
]

const rebuildFtsIndex = async (db: Database): Promise<void> => {
  for (const sql of FTS_STATEMENTS) {
    const result = await db.query(sql)
    if (!result.ok) {
      console.error("[db] FTS index rebuild failed:", result.error.message)
      return
    }
  }
  console.debug("[db] FTS index rebuilt")
}

const DB_SYNC_BATCH_SIZE = 10

let database: Database | null = null
let previousFiles: FileStore = {}
let initializing = false
const runSync = async (db: Database, withSchemas: ProjectionWithSchema[]): Promise<void> => {
  const currentFiles = getFiles()
  const plan = computeSyncPlan(previousFiles, currentFiles)

  if (plan.deleted.length === 0 && plan.changed.length === 0) return

  const batches = batchSyncPlan(plan, DB_SYNC_BATCH_SIZE)
  for (const batch of batches) {
    const result = await syncFiles(
      db,
      batch,
      currentFiles,
      withSchemas,
      getBlocksUntyped,
      getBlockUntyped
    )
    if (!result.ok) {
      console.error("[db] sync failed:", result.error)
      return
    }
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  previousFiles = currentFiles
  console.debug(`[db] synced: ${plan.changed.length} changed, ${plan.deleted.length} deleted`)

  await rebuildFtsIndex(db)
}

export const startDatabase = async (): Promise<void> => {
  if (database || initializing) return
  initializing = true

  const withSchemas = buildProjectionsWithSchemas()
  const ddl = generateDdl(withSchemas)

  console.debug("[db] initializing DuckDB...")
  const result = await initializeDatabase(ddl)

  if (!result.ok) {
    console.error("[db] init failed:", result.error)
    return
  }

  database = result.value
  console.debug("[db] initialized, running initial sync...")

  await runSync(database, withSchemas)

  const debouncedSync = debounce(() => {
    if (database) runSync(database, withSchemas)
  }, 200)

  subscribe(debouncedSync)

  if (typeof window !== "undefined") {
    ;(window as unknown as Record<string, unknown>).query = async (sql: string) => {
      if (!database) return { error: "Database not initialized" }
      const queryResult = await database.query(sql)
      if (!queryResult.ok) return { error: queryResult.error }
      return queryResult.value.rows
    }
  }

  console.debug("[db] ready. Use window.query('SELECT ...') to query.")

  startEmbeddings()
  console.debug("[embeddings] sync started")
}

export const getDatabase = (): Database | null => database

const stripCreateNoise = (ddl: string): string =>
  ddl.replace(/CREATE OR REPLACE TABLE/g, "CREATE TABLE")

const isExposed = (p: ProjectionWithSchema): boolean => p.config.expose !== false

const generateExposedDdl = (withSchemas: ProjectionWithSchema[]): string => {
  const schemas = withSchemas.flatMap((p) => {
    const hidden = p.config.hiddenColumns ?? []
    return hidden.length > 0 ? p.schemas.map((s) => filterHiddenColumns(s, hidden)) : p.schemas
  })
  return schemas.map(tableSchemaToDdl).join("\n\n")
}

let cachedDdl: string | null = null

export const getDatabaseDdl = (): string => {
  if (cachedDdl) return cachedDdl
  const exposed = buildProjectionsWithSchemas().filter(isExposed)
  cachedDdl = stripCreateNoise(generateExposedDdl(exposed))
  return cachedDdl
}
