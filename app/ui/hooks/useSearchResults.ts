import { useState, useEffect } from "react"
import { useSyncExternalStore } from "react"
import { getFiles, subscribe } from "~/lib/files/store"
import { findSearchById } from "~/domain/data-blocks/settings/searches/selectors"
import { getDatabase } from "~/domain/db/database"
import {
  executeSearch,
  executeHybridSearch,
  resolveSemanticSql,
  sanitizeSemanticError,
} from "~/lib/search"
import { getLlmHost } from "~/lib/agent/env"
import type { SearchEntry, SearchHit } from "~/domain/search"

interface SettledState {
  results: SearchHit[]
  lenses: string[]
  error: string | null
  searchId: string | null
}

const EMPTY: SettledState = { results: [], lenses: [], error: null, searchId: null }

const DB_POLL_INTERVAL = 250

interface SearchResults {
  search: SearchEntry | undefined
  results: SearchHit[]
  lenses: string[]
  isLoading: boolean
  error: string | null
}

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

      const resolved = await resolveSemanticSql(search.sql, getLlmHost())
      if (cancelled) return
      if (!resolved.ok) {
        setSettled({ results: [], lenses: [], error: resolved.error, searchId })
        return
      }

      const lenses =
        resolved.value.type === "hybrid" ? resolved.value.plan.angles.map((a) => a.text) : []

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
        setSettled({ results: result.value, lenses, error: null, searchId })
      } else {
        setSettled({
          results: [],
          lenses,
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
    lenses: settled.lenses,
    isLoading,
    error: settled.error,
  }
}
