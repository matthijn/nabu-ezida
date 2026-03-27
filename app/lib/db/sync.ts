import type { FileStore } from "~/lib/files/store"
import type { TableSchema, JsonSchema, DbError } from "./types"
import type { ProjectionConfig } from "./projection"
import type { RunSql } from "./query"
import { extractRows } from "./extract"
import { ok, type Result } from "~/lib/fp/result"

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

export const batchSyncPlan = (plan: SyncPlan, batchSize: number): SyncPlan[] => {
  if (plan.deleted.length === 0 && plan.changed.length === 0) return []

  const batches: SyncPlan[] = []

  const firstBatchChanged = plan.changed.slice(0, batchSize)
  batches.push({ deleted: plan.deleted, changed: firstBatchChanged })

  for (let i = batchSize; i < plan.changed.length; i += batchSize) {
    batches.push({ deleted: [], changed: plan.changed.slice(i, i + batchSize) })
  }

  return batches
}

const isAllowedFile = (filename: string, allowedFiles?: string[]): boolean =>
  !allowedFiles || allowedFiles.includes(filename)

const escapeString = (value: string): string => value.replace(/'/g, "''")

const isNumberArray = (value: unknown[]): value is number[] =>
  value.length > 0 && typeof value[0] === "number"

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return "NULL"
  if (typeof value === "boolean") return value.toString()
  if (typeof value === "number") return value.toString()
  if (Array.isArray(value)) {
    if (isNumberArray(value)) return `[${value.join(", ")}]`
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

const effectiveFile = (config: ProjectionConfig, filename: string): string =>
  config.fileMapper?.(filename) ?? filename

const buildProjectionDeleteSql = (projection: ProjectionWithSchema, filename: string): string => {
  const file = effectiveFile(projection.config, filename)
  return projection.schemas
    .map((s) => `DELETE FROM ${s.name} WHERE file = '${escapeString(file)}';`)
    .join("\n")
}

export const syncFiles = async (
  runSql: RunSql,
  plan: SyncPlan,
  files: FileStore,
  projections: ProjectionWithSchema[],
  getBlocks: (raw: string, language: string) => Record<string, unknown>[],
  getBlock: (raw: string, language: string) => Record<string, unknown> | null
): Promise<Result<void, DbError>> => {
  const statements: string[] = []

  for (const filename of plan.deleted) {
    for (const p of projections) {
      statements.push(buildProjectionDeleteSql(p, filename))
    }
  }

  for (const filename of plan.changed) {
    for (const p of projections) {
      statements.push(buildProjectionDeleteSql(p, filename))
    }

    const raw = files[filename]

    for (const { config, jsonSchema } of projections) {
      if (!isAllowedFile(filename, config.allowedFiles)) continue

      const file = effectiveFile(config, filename)
      const blocks = config.singleton
        ? ([getBlock(raw, config.language)].filter(Boolean) as Record<string, unknown>[])
        : getBlocks(raw, config.language)

      for (const block of blocks) {
        const tableRows = extractRows(config.tableName, jsonSchema, block, file)
        for (const { table, rows } of tableRows) {
          if (rows.length > 0) statements.push(buildInsertSql(table, rows))
        }
      }
    }
  }

  if (statements.length === 0) return ok(undefined)

  const sql = statements.join("\n")
  return runSql(sql)
}
