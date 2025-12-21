import { useMemo, useCallback, useEffect, useRef } from "react"
import type { AsyncDuckDB } from "@duckdb/duckdb-wasm"
import { useStateSync } from "./useStateSync"
import { useDatabase } from "./useDatabase"
import { createClient, formatError } from "~/domain/api"
import type { Domain } from "~/domain/types"
import type { Command, FormattedError } from "~/domain/api"
import type { QueryResult } from "~/lib/db/types"
import { toError } from "~/lib/error"

type SyncEngineConfig<T> = {
  wsBaseUrl: string
  apiBaseUrl: string
  resourceId: string
  queryParams?: Record<string, string>
  schemaSql: string
  onError: (error: FormattedError) => void
  syncToDatabase: (db: AsyncDuckDB, state: T) => Promise<void>
}

type SyncEngineResult<T> = {
  state: {
    data: T | null
    isConnected: boolean
    error: string | null
  }
  database: {
    query: <R = unknown>(sql: string) => Promise<QueryResult<R>>
    isReady: boolean
    error: Error | null
  }
  domain: Domain
}

const SYNC_DEBOUNCE_MS = 100

export const useSyncEngine = <T>({
  wsBaseUrl,
  apiBaseUrl,
  resourceId,
  queryParams,
  schemaSql,
  onError,
  syncToDatabase,
}: SyncEngineConfig<T>): SyncEngineResult<T> => {
  const { state, isConnected, error: wsError } = useStateSync<T>({
    baseUrl: wsBaseUrl,
    resourceId,
    queryParams,
  })

  const database = useDatabase(state, { schemaSql })
  const syncTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!database.db || !database.isReady || !state) return

    if (syncTimeoutRef.current !== null) {
      clearTimeout(syncTimeoutRef.current)
    }

    syncTimeoutRef.current = window.setTimeout(() => {
      syncToDatabase(database.db!, state).catch(err =>
        onError(formatError(toError(err)))
      )
    }, SYNC_DEBOUNCE_MS)

    return () => {
      if (syncTimeoutRef.current !== null) {
        clearTimeout(syncTimeoutRef.current)
      }
    }
  }, [state, database.db, database.isReady, syncToDatabase, onError])

  const client = useMemo(() => createClient(apiBaseUrl), [apiBaseUrl])

  const handleCommandError = useCallback(
    (error: unknown) => onError(formatError(error)),
    [onError]
  )

  const dispatch = useCallback(
    (command: Command) => {
      client.sendCommand(command).catch(handleCommandError)
    },
    [client, handleCommandError]
  )

  const sendCommand = useCallback(
    (command: Command) => client.sendCommand(command),
    [client]
  )

  const domain: Domain = useMemo(
    () => ({ dispatch, sendCommand }),
    [dispatch, sendCommand]
  )

  return {
    state: {
      data: state,
      isConnected,
      error: wsError,
    },
    database: {
      query: database.query,
      isReady: database.isReady,
      error: database.error,
    },
    domain,
  }
}
