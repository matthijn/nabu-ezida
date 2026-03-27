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
import { filterOneHit } from "~/lib/search/filter-hits"
import { processPool } from "~/lib/utils/pool"
import { noop } from "~/lib/utils/noop"
import { updateSearchEntries, readSettings } from "./settings"
import { ensureDescription } from "~/lib/search/ensure-description"
import type { SearchEntry, SearchHit } from "~/domain/search"

const generateShortId = (): string => {
  const digit = Math.floor(Math.random() * 10).toString()
  const rest = Math.random().toString(36).substring(2, 9)
  return digit + rest
}

const generateSearchId = (): string => `search-${generateShortId()}`

const MAX_UNSAVED = 3
const EARLY_RETURN_TARGET = 3

const isUnsaved = (entry: SearchEntry): boolean => !entry.saved

const rotateUnsaved = (entries: SearchEntry[]): SearchEntry[] => {
  const saved = entries.filter((e) => e.saved)
  const unsaved = entries.filter(isUnsaved)
  const sorted = [...unsaved].sort((a, b) => b.createdAt - a.createdAt)
  return [...saved, ...sorted.slice(0, MAX_UNSAVED)]
}

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

const formatOutput = (id: string, hits: SearchHit[]): string => {
  const lines = hits.map(formatHit).join("\n")
  return `file://${id}\nresult samples:\n${lines}`
}

const filterEarly = async (
  hits: SearchHit[],
  description: string,
  highlight: string
): Promise<SearchHit[]> => {
  const filterFn = (hit: SearchHit) => filterOneHit(hit, description, highlight)
  const { results } = await processPool(hits, filterFn, noop, {
    concurrency: EARLY_RETURN_TARGET,
    target: EARLY_RETURN_TARGET,
  })
  return results
}

const handleSearch = async (call: { args: unknown }): Promise<ToolResult<unknown>> => {
  const parsed = SearchArgs.safeParse(call.args)
  if (!parsed.success) return { status: "error", output: `Invalid args: ${parsed.error.message}` }

  const db = getDatabase()
  if (!db) return { status: "error", output: "Database not ready. Try again shortly." }

  const settings = readSettings()
  const description = await ensureDescription(settings.description, db)

  const resolved = await resolveSemanticSql(parsed.data.sql, {
    db,
    baseUrl: getLlmHost(),
    description,
  })
  if (!resolved.ok) return { status: "error", output: resolved.error.message }

  const rawHits =
    resolved.value.type === "plain"
      ? await executeSearch(db, resolved.value.sql)
      : await executeHybridLocal(db, resolved.value.plan)

  if (!rawHits.ok) return { status: "error", output: sanitizeSemanticError(rawHits.error.message) }

  const filtered = await filterEarly(rawHits.value, description, parsed.data.highlight)
  if (hasNoResults(filtered)) return formatEmpty(parsed.data.sql)

  return saveSearch(parsed.data, settings, (id) => formatOutput(id, filtered))
}

const saveSearch = (
  data: { title: string; description: string; highlight: string; sql: string },
  settings: ReturnType<typeof readSettings>,
  format: (id: string) => string
): ToolResult<unknown> => {
  const id = generateSearchId()
  const entry: SearchEntry = {
    id,
    title: data.title,
    description: data.description,
    highlight: data.highlight,
    saved: false,
    createdAt: Date.now(),
    sql: data.sql,
  }

  const withNew = [...(settings.searches ?? []), entry]
  const rotated = rotateUnsaved(withNew)
  const writeError = updateSearchEntries(rotated)
  if (writeError) return { status: "error", output: writeError }

  return { status: "ok", output: format(id) }
}

registerSpecialHandler("search", handleSearch)
