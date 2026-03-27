import { useState, useEffect, useRef, useCallback } from "react"
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
import { filterOneHit } from "~/lib/search/filter-hits"
import { ensureDescription } from "~/lib/search/ensure-description"
import { processPool } from "~/lib/utils/pool"
import { getLlmHost } from "~/lib/agent/env"
import type { SearchEntry, SearchHit } from "~/domain/search"
import type { HydeQuery } from "~/lib/search/semantic"

export type SearchPhase = "idle" | "searching" | "filtering" | "done"

const FILTER_CHUNK_TARGET = 10
const FILTER_CONCURRENCY = 5

interface SettledState {
  results: SearchHit[]
  hydes: HydeQuery[]
  error: string | null
  searchId: string | null
  phase: SearchPhase
  hasMore: boolean
}

const EMPTY: SettledState = {
  results: [],
  hydes: [],
  error: null,
  searchId: null,
  phase: "idle",
  hasMore: false,
}

const DB_POLL_INTERVAL = 250

export interface SearchResults {
  search: SearchEntry | undefined
  results: SearchHit[]
  hydes: HydeQuery[]
  phase: SearchPhase
  error: string | null
  hasMore: boolean
  loadMore: () => void
}

const readDescription = (): string | undefined =>
  getSettings(getFileRaw(SETTINGS_FILE))?.description

interface FilterState {
  rawHits: SearchHit[]
  cursor: number
  description: string
  highlight: string
  loading: boolean
  cancelled: boolean
}

export const useSearchResults = (searchId: string, revision = 0): SearchResults => {
  const files = useSyncExternalStore(subscribe, getFiles)
  const search = findSearchById(files, searchId)
  const [settled, setSettled] = useState<SettledState>(EMPTY)
  const filterRef = useRef<FilterState | null>(null)

  const filterNextChunk = useCallback(async () => {
    const state = filterRef.current
    if (!state || state.loading || state.cancelled || state.cursor >= state.rawHits.length) return

    state.loading = true
    setSettled((prev) => ({ ...prev, phase: "filtering" }))

    const remaining = state.rawHits.slice(state.cursor)
    const filterFn = (hit: SearchHit) => filterOneHit(hit, state.description, state.highlight)
    const appendHits = (hits: SearchHit[]) => {
      if (state.cancelled) return
      setSettled((prev) => ({ ...prev, results: [...prev.results, ...hits] }))
    }

    const { consumed } = await processPool(remaining, filterFn, appendHits, {
      concurrency: FILTER_CONCURRENCY,
      target: FILTER_CHUNK_TARGET,
    })

    if (state.cancelled) return

    state.cursor += consumed
    state.loading = false

    const hasMore = state.cursor < state.rawHits.length
    setSettled((prev) => ({ ...prev, phase: hasMore ? "idle" : "done", hasMore }))
  }, [])

  useEffect(() => {
    if (!search) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    if (filterRef.current) filterRef.current.cancelled = true
    filterRef.current = null

    const run = async () => {
      const db = getDatabase()
      if (!db) {
        if (!cancelled) timer = setTimeout(run, DB_POLL_INTERVAL)
        return
      }

      setSettled({
        results: [],
        hydes: [],
        error: null,
        searchId,
        phase: "searching",
        hasMore: false,
      })

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
          hasMore: false,
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
          hasMore: false,
        })
        return
      }

      setSettled((prev) => ({ ...prev, hydes }))

      filterRef.current = {
        rawHits: rawHits.value,
        cursor: 0,
        description,
        highlight: search.highlight,
        loading: false,
        cancelled,
      }

      filterNextChunk()
    }

    run()
    return () => {
      cancelled = true
      if (filterRef.current) filterRef.current.cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [search, searchId, revision, filterNextChunk])

  return {
    search,
    results: settled.results,
    hydes: settled.hydes,
    phase: settled.phase,
    error: settled.error,
    hasMore: settled.hasMore,
    loadMore: filterNextChunk,
  }
}
