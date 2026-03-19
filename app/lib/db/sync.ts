import type { FileStore } from "~/lib/files/store"
import type { Database, TableSchema, JsonSchema, DbError } from "./types"
import type { ProjectionConfig } from "./projection"
import { extractRows } from "./extract"
import { ok, err, type Result } from "~/lib/fp/result"

export interface SyncPlan {
  deleted: string[]
  changed: string[]
}

export interface ProjectionWithSchema {
  config: ProjectionConfig
  jsonSchema: JsonSchema
  schemas: TableSchema[]
}

export const computeSyncPlan = (prev: FileStore, next: FileStore): SyncPlan => {
  const deleted = Object.keys(prev).filter((f) => !(f in next))
  const changed = Object.keys(next).filter((f) => next[f] !== prev[f])
  return { deleted, changed }
}

const isAllowedFile = (filename: string, allowedFiles?: string[]): boolean =>
  !allowedFiles || allowedFiles.includes(filename)

const escapeString = (value: string): string => value.replace(/'/g, "''")

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return "NULL"
  if (typeof value === "boolean") return value.toString()
  if (typeof value === "number") return value.toString()
  if (Array.isArray(value)) {
    const items = value.map((v) => `'${escapeString(String(v))}'`).join(", ")
    return `[${items}]`
  }
  return `'${escapeString(String(value))}'`
}

const buildInsertSql = (table: string, rows: Record<string, unknown>[]): string => {
  if (rows.length === 0) return ""
  const columns = Object.keys(rows[0])
  const columnList = columns.join(", ")
  const valueRows = rows.map((row) => {
    const values = columns.map((col) => formatValue(row[col])).join(", ")
    return `(${values})`
  })
  return `INSERT INTO ${table} (${columnList}) VALUES ${valueRows.join(", ")};`
}

const buildDeleteSql = (tables: string[], filename: string): string =>
  tables.map((t) => `DELETE FROM ${t} WHERE file = '${escapeString(filename)}';`).join("\n")

const buildFilesDeleteSql = (filename: string): string =>
  `DELETE FROM files WHERE filename = '${escapeString(filename)}';`

const getAllTableNames = (projections: ProjectionWithSchema[]): string[] =>
  projections.flatMap((p) => p.schemas.map((s) => s.name))

export const syncFiles = async (
  db: Database,
  plan: SyncPlan,
  files: FileStore,
  projections: ProjectionWithSchema[],
  getBlocks: (raw: string, language: string) => Record<string, unknown>[],
  getBlock: (raw: string, language: string) => Record<string, unknown> | null
): Promise<Result<void, DbError>> => {
  const projectionTables = getAllTableNames(projections)
  const statements: string[] = []

  for (const filename of plan.deleted) {
    statements.push(buildFilesDeleteSql(filename))
    statements.push(buildDeleteSql(projectionTables, filename))
  }

  for (const filename of plan.changed) {
    statements.push(buildFilesDeleteSql(filename))
    statements.push(buildDeleteSql(projectionTables, filename))

    const raw = files[filename]
    statements.push(buildInsertSql("files", [{ filename, content: raw }]))

    for (const { config, jsonSchema } of projections) {
      if (!isAllowedFile(filename, config.allowedFiles)) continue

      const blocks = config.singleton
        ? ([getBlock(raw, config.language)].filter(Boolean) as Record<string, unknown>[])
        : getBlocks(raw, config.language)

      for (const block of blocks) {
        const tableRows = extractRows(config.tableName, jsonSchema, block, filename)
        for (const { table, rows } of tableRows) {
          if (rows.length > 0) statements.push(buildInsertSql(table, rows))
        }
      }
    }
  }

  if (statements.length === 0) return ok(undefined)

  const sql = statements.join("\n")
  const result = await db.query(sql)
  if (!result.ok) return err({ type: "query", message: "Sync failed", cause: result.error })

  return ok(undefined)
}
