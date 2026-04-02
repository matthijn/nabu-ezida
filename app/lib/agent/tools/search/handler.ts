import type { ToolResult } from "../../types"
import { SearchArgs } from "./def"
import { registerSpecialHandler } from "../../executors/delegation"
import { getDatabase } from "~/domain/db/database"
import { getLlmHost } from "~/lib/agent/env"
import {
  executeSearch,
  executeHybridLocal,
  resolveSemanticSql,
  sanitizeSemanticError,
} from "~/lib/search"
import { saveNewSearch } from "./settings"
import { buildClassificationTree } from "~/lib/topic-assignment/tree"
import { getFiles } from "~/lib/files/store"
import type { SearchHit } from "~/domain/search"

const MAX_SEARCH_ROWS = 50

const formatHit = (hit: SearchHit): string => {
  if (hit.id && hit.text) return `${hit.file} → ${hit.id}: ${hit.text}`
  if (hit.id) return `${hit.file} → ${hit.id}`
  if (hit.text) return `${hit.file}: ${hit.text}`
  return hit.file
}

const hasNoResults = (hits: SearchHit[]): boolean => hits.length === 0

const formatEmpty = (sql: string): ToolResult<unknown> => ({
  status: "error",
  output: `0 results returned for query: ${sql}`,
})

const formatOutput = (id: string, hits: SearchHit[], capped: boolean): string => {
  const lines = hits.map(formatHit).join("\n")
  const suffix = capped ? `\n(capped to ${MAX_SEARCH_ROWS} rows)` : ""
  return `file://${id}\nresult samples:\n${lines}${suffix}`
}

const handleSearch = async (call: { args: unknown }): Promise<ToolResult<unknown>> => {
  const parsed = SearchArgs.safeParse(call.args)
  if (!parsed.success) return { status: "error", output: `Invalid args: ${parsed.error.message}` }

  const db = getDatabase()
  if (!db) return { status: "error", output: "Database not ready. Try again shortly." }

  const tree = buildClassificationTree(getFiles()) ?? ""

  const resolved = await resolveSemanticSql(parsed.data.sql, {
    db,
    baseUrl: getLlmHost(),
    tree,
  })
  if (!resolved.ok) return { status: "error", output: resolved.error.message }

  const rawHits =
    resolved.value.type === "plain"
      ? await executeSearch(db, resolved.value.sql)
      : await executeHybridLocal(db, resolved.value.plan)

  if (!rawHits.ok) return { status: "error", output: sanitizeSemanticError(rawHits.error.message) }

  const capped = rawHits.value.length > MAX_SEARCH_ROWS
  const hits = capped ? rawHits.value.slice(0, MAX_SEARCH_ROWS) : rawHits.value
  if (hasNoResults(hits)) return formatEmpty(parsed.data.sql)

  const id = saveNewSearch(parsed.data)
  if (!id) return { status: "error", output: "Failed to save search" }

  return { status: "ok", output: formatOutput(id, hits, capped) }
}

registerSpecialHandler("search", handleSearch)
