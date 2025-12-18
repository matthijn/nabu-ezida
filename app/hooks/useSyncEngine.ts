import { useMemo, useCallback } from "react"
import { useStateSync } from "./useStateSync"
import { useDatabase } from "./useDatabase"
import { createClient, formatError } from "~/domain/api"
import type { Domain } from "~/domain/types"
import type { Command, FormattedError } from "~/domain/api"
import type { QueryResult } from "~/lib/db/types"

type SyncEngineConfig<T> = {
  wsBaseUrl: string
  apiBaseUrl: string
  resourceId: string
  queryParams?: Record<string, string>
  schemaSql: string
  onError: (error: FormattedError) => void
  syncToDatabase?: (state: T) => Promise<void>
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

  const handleStateChange = useCallback(
    async (s: unknown) => {
      if (s && syncToDatabase) await syncToDatabase(s as T)
    },
    [syncToDatabase]
  )

  const database = useDatabase(state, {
    schemaSql,
    onStateChange: syncToDatabase ? handleStateChange : undefined,
  })

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
