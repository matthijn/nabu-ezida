import { useState, useEffect } from "react"
import { useSyncExternalStore } from "react"
import { getFiles, subscribe } from "~/lib/files/store"
import { findSearchById } from "~/domain/data-blocks/settings/searches/selectors"
import { getDatabase } from "~/domain/db/database"
import { executeSearchQueries } from "~/lib/search"
import type { SearchEntry, SearchHit } from "~/domain/search"

interface SettledState {
  results: SearchHit[]
  error: string | null
  searchId: string | null
}

const EMPTY: SettledState = { results: [], error: null, searchId: null }

interface SearchResults {
  search: SearchEntry | undefined
  results: SearchHit[]
  isLoading: boolean
  error: string | null
}

export const useSearchResults = (searchId: string): SearchResults => {
  const files = useSyncExternalStore(subscribe, getFiles)
  const search = findSearchById(files, searchId)
  const [settled, setSettled] = useState<SettledState>(EMPTY)

  useEffect(() => {
    if (!search) return

    let cancelled = false

    const run = async () => {
      const db = getDatabase()
      if (!db) {
        if (!cancelled) setSettled({ results: [], error: "Database not ready", searchId })
        return
      }

      const result = await executeSearchQueries(db, search.queries)
      if (cancelled) return

      if (result.ok) {
        setSettled({ results: result.value, error: null, searchId })
      } else {
        setSettled({ results: [], error: result.error.message, searchId })
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [search, searchId])

  const isLoading = !!search && settled.searchId !== searchId

  return { search, results: settled.results, isLoading, error: settled.error }
}
