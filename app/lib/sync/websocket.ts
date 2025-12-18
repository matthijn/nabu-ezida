type WebSocketConfig<T> = {
  url: string
  onMessage: (message: T) => void
  onOpen?: () => void
  onClose?: () => void
  onError?: (error: Event) => void
  reconnect?: boolean
  maxReconnectDelay?: number
}

type WebSocketConnection = {
  close: () => void
  send: (data: string) => void
  readyState: () => number
}

const calculateReconnectDelay = (attempt: number, maxDelay: number): number => {
  const baseDelay = 1000
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
  const jitter = Math.random() * 1000
  return exponentialDelay + jitter
}

export const createWebSocketConnection = <T>(config: WebSocketConfig<T>): WebSocketConnection => {
  const shouldReconnect = config.reconnect ?? true
  const maxDelay = config.maxReconnectDelay ?? 30000
  let ws: WebSocket | null = null
  let reconnectAttempt = 0
  let reconnectTimeout: number | null = null
  let intentionallyClosed = false

  const connect = () => {
    if (intentionallyClosed) return

    ws = new WebSocket(config.url)

    ws.onopen = () => {
      reconnectAttempt = 0
      config.onOpen?.()
    }

    ws.onclose = () => {
      config.onClose?.()

      if (shouldReconnect && !intentionallyClosed) {
        const delay = calculateReconnectDelay(reconnectAttempt, maxDelay)
        reconnectAttempt++
        reconnectTimeout = window.setTimeout(connect, delay)
      }
    }

    ws.onerror = error => {
      config.onError?.(error)
    }

    ws.onmessage = event => {
      const message = JSON.parse(event.data) as T
      config.onMessage(message)
    }
  }

  connect()

  return {
    close: () => {
      intentionallyClosed = true
      if (reconnectTimeout !== null) {
        clearTimeout(reconnectTimeout)
        reconnectTimeout = null
      }
      ws?.close()
    },
    send: (data: string) => ws?.send(data),
    readyState: () => ws?.readyState ?? WebSocket.CLOSED,
  }
}
