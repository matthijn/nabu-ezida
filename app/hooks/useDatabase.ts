import { useEffect, useRef, useState, useCallback } from "react"
import type { AsyncDuckDB } from "@duckdb/duckdb-wasm"
import { initializeDatabase } from "~/lib/db/init"
import type { Database, QueryResult } from "~/lib/db/types"
import { DatabaseError } from "~/lib/db/types"
import { toError } from "~/lib/error"

type UseDatabaseConfig = {
  schemaSql: string
  onStateChange?: (state: unknown) => Promise<void>
}

type UseDatabaseResult = {
  query: <T = unknown>(sql: string) => Promise<QueryResult<T>>
  isReady: boolean
  error: Error | null
  db: AsyncDuckDB | null
}

const SYNC_DEBOUNCE_MS = 100

export const useDatabase = <T>(
  state: T | null,
  config: UseDatabaseConfig
): UseDatabaseResult => {
  const dbRef = useRef<Database | null>(null)
  const [isReady, setReady] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const syncTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false

    const initDb = async () => {
      try {
        const db = await initializeDatabase(config.schemaSql)
        if (cancelled) return
        dbRef.current = db
        setReady(true)
        setError(null)
      } catch (err) {
        if (cancelled) return
        setError(toError(err))
        setReady(false)
      }
    }

    initDb()

    return () => {
      cancelled = true
    }
  }, [config.schemaSql])

  useEffect(() => {
    if (!dbRef.current || !isReady || !config.onStateChange) return

    if (syncTimeoutRef.current !== null) {
      clearTimeout(syncTimeoutRef.current)
    }

    const handleSyncError = (err: unknown) => setError(toError(err))

    const triggerSync = () => {
      config.onStateChange?.(state)?.catch(handleSyncError)
    }

    syncTimeoutRef.current = window.setTimeout(triggerSync, SYNC_DEBOUNCE_MS)

    const clearSyncTimeout = () => {
      if (syncTimeoutRef.current !== null) {
        clearTimeout(syncTimeoutRef.current)
      }
    }

    return clearSyncTimeout
  }, [state, isReady, config.onStateChange])

  const query = useCallback(
    async <T = unknown>(sql: string): Promise<QueryResult<T>> => {
      if (!dbRef.current) {
        throw new DatabaseError("query", "Database not initialized")
      }
      return dbRef.current.query<T>(sql)
    },
    [isReady]
  )

  return {
    query,
    isReady,
    error,
    db: dbRef.current?.instance ?? null,
  }
}
