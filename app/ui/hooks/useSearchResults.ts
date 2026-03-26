import { useState, useEffect } from "react"
import { useSyncExternalStore } from "react"
import { getFiles, subscribe } from "~/lib/files/store"
import { getFileRaw } from "~/lib/files"
import { findSearchById } from "~/domain/data-blocks/settings/searches/selectors"
import { getSettings } from "~/domain/data-blocks/settings/selectors"
import { SETTINGS_FILE } from "~/lib/files/filename"
import { getDatabase } from "~/domain/db/database"
import {
  executeSearch,
  executeHybridLocal,
  resolveSemanticSql,
  sanitizeSemanticError,
} from "~/lib/search"
import { streamFilterHits } from "~/lib/search/filter-hits"
import { ensureDescription } from "~/lib/search/ensure-description"
import { getLlmHost } from "~/lib/agent/env"
import type { SearchEntry, SearchHit } from "~/domain/search"
import type { HydeQuery } from "~/lib/search/semantic"

type SearchPhase = "idle" | "searching" | "filtering" | "done"

interface SettledState {
  results: SearchHit[]
  hydes: HydeQuery[]
  error: string | null
  searchId: string | null
  phase: SearchPhase
}

const EMPTY: SettledState = { results: [], hydes: [], error: null, searchId: null, phase: "idle" }

const DB_POLL_INTERVAL = 250

export interface SearchResults {
  search: SearchEntry | undefined
  results: SearchHit[]
  hydes: HydeQuery[]
  phase: SearchPhase
  error: string | null
}

const readDescription = (): string | undefined =>
  getSettings(getFileRaw(SETTINGS_FILE))?.description

export const useSearchResults = (searchId: string, revision = 0): SearchResults => {
  const files = useSyncExternalStore(subscribe, getFiles)
  const search = findSearchById(files, searchId)
  const [settled, setSettled] = useState<SettledState>(EMPTY)

  useEffect(() => {
    if (!search) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const run = async () => {
      const db = getDatabase()
      if (!db) {
        if (!cancelled) timer = setTimeout(run, DB_POLL_INTERVAL)
        return
      }

      setSettled({ results: [], hydes: [], error: null, searchId, phase: "searching" })

      const description = await ensureDescription(readDescription(), db)
      const resolved = await resolveSemanticSql(search.sql, {
        db,
        baseUrl: getLlmHost(),
        description,
      })
      if (cancelled) return
      if (!resolved.ok) {
        if (resolved.error.type === "not_ready") {
          if (!cancelled) timer = setTimeout(run, DB_POLL_INTERVAL)
          return
        }
        setSettled({
          results: [],
          hydes: [],
          error: resolved.error.message,
          searchId,
          phase: "done",
        })
        return
      }

      const hydes = resolved.value.type === "hybrid" ? resolved.value.plan.hydes : []

      const rawHits =
        resolved.value.type === "plain"
          ? await executeSearch(db, resolved.value.sql)
          : await executeHybridLocal(db, resolved.value.plan)

      if (cancelled) return
      if (!rawHits.ok) {
        setSettled({
          results: [],
          hydes,
          error: sanitizeSemanticError(rawHits.error.message),
          searchId,
          phase: "done",
        })
        return
      }

      setSettled((prev) => ({ ...prev, hydes, phase: "filtering" }))

      const appendHits = (hits: SearchHit[]) => {
        if (cancelled) return
        setSettled((prev) => ({ ...prev, results: [...prev.results, ...hits] }))
      }

      await streamFilterHits(rawHits.value, description, search.highlight, appendHits)
      if (cancelled) return

      setSettled((prev) => ({ ...prev, phase: "done" }))
    }

    run()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [search, searchId, revision])

  return {
    search,
    results: settled.results,
    hydes: settled.hydes,
    phase: settled.phase,
    error: settled.error,
  }
}
