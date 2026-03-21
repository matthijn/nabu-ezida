import { subscribe, getFiles, type FileStore } from "~/lib/files/store"
import { getBlock, getBlocks } from "~/lib/data-blocks/query"
import { debounce } from "~/lib/utils/debounce"
import { initializeDatabase } from "~/lib/db/init"
import { computeSyncPlan, syncFiles, type ProjectionWithSchema } from "~/lib/db/sync"
import { jsonSchemaToTableProjection, tableSchemaToDdl } from "~/lib/db/ddl"
import { projections, toJsonSchema } from "./projections"
import type { Database } from "~/lib/db/types"

const FILES_TABLE_DDL = `CREATE OR REPLACE TABLE files (\n  filename VARCHAR NOT NULL,\n  content VARCHAR NOT NULL\n);`

const buildProjectionsWithSchemas = (): ProjectionWithSchema[] =>
  projections.map((config) => {
    const jsonSchema = toJsonSchema(config)
    const { schemas } = jsonSchemaToTableProjection(config.tableName, jsonSchema)
    return { config, jsonSchema, schemas }
  })

const generateDdl = (withSchemas: ProjectionWithSchema[]): string => {
  const projectionDdl = withSchemas.flatMap((p) => p.schemas.map(tableSchemaToDdl))
  return [FILES_TABLE_DDL, ...projectionDdl].join("\n\n")
}

const findProjectionSchema = (language: string) => {
  const projection = projections.find((p) => p.language === language)
  if (!projection) throw new Error(`Unknown projection language: ${language}`)
  return projection.schema
}

const getBlocksUntyped = (raw: string, language: string): Record<string, unknown>[] =>
  getBlocks(raw, language, findProjectionSchema(language)) as Record<string, unknown>[]

const getBlockUntyped = (raw: string, language: string): Record<string, unknown> | null =>
  getBlock(raw, language, findProjectionSchema(language)) as Record<string, unknown> | null

let database: Database | null = null
let previousFiles: FileStore = {}
let initializing = false
const runSync = async (db: Database, withSchemas: ProjectionWithSchema[]): Promise<void> => {
  const currentFiles = getFiles()
  const plan = computeSyncPlan(previousFiles, currentFiles)

  if (plan.deleted.length === 0 && plan.changed.length === 0) return

  const result = await syncFiles(
    db,
    plan,
    currentFiles,
    withSchemas,
    getBlocksUntyped,
    getBlockUntyped
  )
  if (result.ok) {
    previousFiles = currentFiles
    console.debug(`[db] synced: ${plan.changed.length} changed, ${plan.deleted.length} deleted`)
  } else {
    console.error("[db] sync failed:", result.error)
  }
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
}

export const getDatabase = (): Database | null => database

const stripCreateNoise = (ddl: string): string =>
  ddl.replace(/CREATE OR REPLACE TABLE/g, "CREATE TABLE")

let cachedDdl: string | null = null

export const getDatabaseDdl = (): string => {
  if (cachedDdl) return cachedDdl
  cachedDdl = stripCreateNoise(generateDdl(buildProjectionsWithSchemas()))
  return cachedDdl
}
