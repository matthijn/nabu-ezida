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
  executeHybridSearch,
  resolveSemanticSql,
  sanitizeSemanticError,
} from "~/lib/search"
import { ensureDescription } from "~/lib/search/ensure-description"
import { getLlmHost } from "~/lib/agent/env"
import type { SearchEntry, SearchHit } from "~/domain/search"
import type { HydeQuery } from "~/lib/search/semantic"

interface SettledState {
  results: SearchHit[]
  hydes: HydeQuery[]
  error: string | null
  searchId: string | null
}

const EMPTY: SettledState = { results: [], hydes: [], error: null, searchId: null }

const DB_POLL_INTERVAL = 250

interface SearchResults {
  search: SearchEntry | undefined
  results: SearchHit[]
  hydes: HydeQuery[]
  isLoading: boolean
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

      const description = await ensureDescription(readDescription(), db)
      const resolved = await resolveSemanticSql(search.sql, {
        db,
        baseUrl: getLlmHost(),
        description,
      })
      if (cancelled) return
      if (!resolved.ok) {
        setSettled({ results: [], hydes: [], error: resolved.error, searchId })
        return
      }

      const hydes = resolved.value.type === "hybrid" ? resolved.value.plan.hydes : []

      const result =
        resolved.value.type === "plain"
          ? await executeSearch(db, resolved.value.sql)
          : await executeHybridSearch(db, resolved.value.plan)
      console.debug("[SEARCH]", {
        cancelled,
        ok: result.ok,
        hits: result.ok ? result.value.length : 0,
      })
      if (cancelled) return

      if (result.ok) {
        setSettled({ results: result.value, hydes, error: null, searchId })
      } else {
        setSettled({
          results: [],
          hydes,
          error: sanitizeSemanticError(result.error.message),
          searchId,
        })
      }
    }

    run()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [search, searchId, revision])

  const isLoading = !!search && settled.searchId !== searchId

  return {
    search,
    results: settled.results,
    hydes: settled.hydes,
    isLoading,
    error: settled.error,
  }
}
