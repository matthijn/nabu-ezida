import type { ToolResult } from "../../types"
import { SearchArgs } from "./def"
import { registerSpecialHandler } from "../../executors/delegation"
import { getDatabase } from "~/domain/db/database"
import { getLlmHost } from "~/lib/agent/env"
import {
  executeSearch,
  executeHybridSearch,
  resolveSemanticSql,
  sanitizeSemanticError,
} from "~/lib/search"
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

const isUnsaved = (entry: SearchEntry): boolean => !entry.saved

const rotateUnsaved = (entries: SearchEntry[]): SearchEntry[] => {
  const saved = entries.filter((e) => e.saved)
  const unsaved = entries.filter(isUnsaved)
  const sorted = [...unsaved].sort((a, b) => b.createdAt - a.createdAt)
  return [...saved, ...sorted.slice(0, MAX_UNSAVED)]
}

const INLINE_THRESHOLD = 5

const countUniqueFiles = (hits: { file: string }[]): number => new Set(hits.map((h) => h.file)).size

const formatHit = (hit: SearchHit): string => {
  if (hit.id && hit.text) return `${hit.file} → ${hit.id}: ${hit.text.slice(0, 80)}`
  if (hit.id) return `${hit.file} → ${hit.id}`
  if (hit.text) return `${hit.file}: ${hit.text.slice(0, 80)}`
  return hit.file
}

const formatInlineResults = (hits: SearchHit[]): string => hits.map(formatHit).join("\n")

const formatOutput = (id: string, hits: SearchHit[]): string => {
  const hitCount = hits.length
  const fileCount = countUniqueFiles(hits)
  const summary = `file://${id}\n${hitCount} results across ${fileCount} files`
  if (hitCount >= INLINE_THRESHOLD) return summary
  return `${summary}\n\n${formatInlineResults(hits)}`
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
  if (!resolved.ok) return { status: "error", output: resolved.error }

  const result =
    resolved.value.type === "plain"
      ? await executeSearch(db, resolved.value.sql)
      : await executeHybridSearch(db, resolved.value.plan)
  if (!result.ok) return { status: "error", output: sanitizeSemanticError(result.error.message) }

  const id = generateSearchId()
  const entry: SearchEntry = {
    id,
    title: parsed.data.title,
    description: parsed.data.description,
    saved: false,
    createdAt: Date.now(),
    sql: parsed.data.sql,
  }

  const withNew = [...(settings.searches ?? []), entry]
  const rotated = rotateUnsaved(withNew)
  const writeError = updateSearchEntries(rotated)
  if (writeError) return { status: "error", output: writeError }

  return {
    status: "ok",
    output: formatOutput(id, result.value),
  }
}

registerSpecialHandler("search", handleSearch)
