import type { ToolResult } from "../../types"
import { QueryArgs } from "./def"
import { registerSpecialHandler } from "../../executors/delegation"
import { getDatabase } from "~/domain/db/database"
import { getLlmHost } from "~/lib/agent/env"
import { resolveSemanticSql, sanitizeSemanticError } from "~/lib/search"
import { capRows } from "./truncate"

const MAX_QUERY_ROWS = 50

const formatOutput = (rows: Record<string, unknown>[], capped: boolean): string => {
  const suffix = capped ? `\n(capped to ${MAX_QUERY_ROWS} rows)` : ""
  return JSON.stringify(rows, null, 2) + suffix
}

const executeQuery = async (call: { args: unknown }): Promise<ToolResult<unknown>> => {
  const parsed = QueryArgs.safeParse(call.args)
  if (!parsed.success) return { status: "error", output: `Invalid args: ${parsed.error.message}` }

  const db = getDatabase()
  if (!db) return { status: "error", output: "Database not ready. Try again shortly." }

  const resolved = await resolveSemanticSql(parsed.data.sql, getLlmHost())
  if (!resolved.ok) return { status: "error", output: resolved.error }
  const sql = resolved.value

  const result = await db.query<Record<string, unknown>>(sql)
  if (!result.ok) return { status: "error", output: sanitizeSemanticError(result.error.message) }

  const { rows, capped } = capRows(result.value.rows, MAX_QUERY_ROWS)

  return { status: "ok", output: formatOutput(rows, capped) }
}

registerSpecialHandler("query", executeQuery)
