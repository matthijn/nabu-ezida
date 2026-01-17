import type { Handler } from "../types"

export const executeSql: Handler = async (deps, args) => {
  if (!deps.query) return { error: "Database not available" }
  const result = await deps.query(args.sql as string)
  return { rows: result.rows, rowCount: result.rowCount }
}
