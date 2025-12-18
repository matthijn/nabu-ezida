import { useEffect, useState, useMemo } from "react"
import { createWebSocketConnection } from "~/lib/sync/websocket"
import { applyPatchableMessage, type PatchableMessage } from "~/lib/sync/patch"
import { buildUrl } from "~/lib/url"

type UseStateSyncConfig = {
  baseUrl: string
  resourceId: string
  queryParams?: Record<string, string>
}

type UseStateSyncResult<T> = {
  state: T | null
  isConnected: boolean
  error: string | null
}

export const useStateSync = <T>({
  baseUrl,
  resourceId,
  queryParams,
}: UseStateSyncConfig): UseStateSyncResult<T> => {
  const [state, setState] = useState<T | null>(null)
  const [isConnected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const queryParamsKey = useMemo(
    () => (queryParams ? JSON.stringify(queryParams) : ""),
    [queryParams]
  )

  useEffect(() => {
    const url = buildUrl(baseUrl, resourceId, queryParams)

    const handleMessage = (msg: PatchableMessage<T>) =>
      setState(current => applyPatchableMessage(current, msg))

    const handleOpen = () => {
      setConnected(true)
      setError(null)
    }

    const handleClose = () => setConnected(false)

    const handleError = () => setError("WebSocket connection error")

    const ws = createWebSocketConnection<PatchableMessage<T>>({
      url,
      onMessage: handleMessage,
      onOpen: handleOpen,
      onClose: handleClose,
      onError: handleError,
    })

    return ws.close
  }, [baseUrl, resourceId, queryParamsKey])

  return { state, isConnected, error }
}
