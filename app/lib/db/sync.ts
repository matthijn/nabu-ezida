import type { AsyncDuckDBConnection } from "@duckdb/duckdb-wasm"
import { DatabaseError } from "./types"

const rowToInsertValues = (row: Record<string, unknown>): string => {
  const values = Object.values(row).map(v => {
    if (v === null || v === undefined) return "NULL"
    if (typeof v === "boolean") return v ? "TRUE" : "FALSE"
    if (typeof v === "number") return String(v)
    return `'${String(v).replace(/'/g, "''")}'`
  })
  return `(${values.join(", ")})`
}

const generateInsertSql = <T extends Record<string, unknown>>(
  tableName: string,
  rows: T[]
): string => {
  if (rows.length === 0) return ""

  const columns = Object.keys(rows[0])
  const valuesSql = rows.map(rowToInsertValues).join(",\n  ")

  return `INSERT OR REPLACE INTO ${tableName} (${columns.join(", ")})
VALUES
  ${valuesSql};`
}

export const insertRows = async <T extends Record<string, unknown>>(
  conn: AsyncDuckDBConnection,
  tableName: string,
  rows: T[]
): Promise<void> => {
  if (rows.length === 0) return

  const sql = generateInsertSql(tableName, rows)
  try {
    await conn.query(sql)
  } catch (cause) {
    throw new DatabaseError("sync", `Failed to insert into ${tableName}`, cause)
  }
}

export const clearTable = async (
  conn: AsyncDuckDBConnection,
  tableName: string
): Promise<void> => {
  try {
    await conn.query(`DELETE FROM ${tableName};`)
  } catch (cause) {
    throw new DatabaseError("sync", `Failed to clear ${tableName}`, cause)
  }
}
