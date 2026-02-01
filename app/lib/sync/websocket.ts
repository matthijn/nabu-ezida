import { getWsUrl } from "../env"
import { calculateBackoff } from "../backoff"
import type { Command } from "./types"

type WebSocketCallbacks = {
  onCommand: (command: Command) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
}

type WebSocketConnection = {
  close: () => void
}

const MAX_RECONNECT_DELAY = 30000

export const createWebSocket = (
  projectId: string,
  callbacks: WebSocketCallbacks
): WebSocketConnection => {
  let ws: WebSocket | null = null
  let reconnectAttempt = 0
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  let closed = false

  const connect = () => {
    if (closed) return

    const url = getWsUrl(`/ws/${projectId}`)
    ws = new WebSocket(url)
    let messageCount = 0

    ws.onopen = () => {
      reconnectAttempt = 0
      messageCount = 0
      callbacks.onConnect?.()
    }

    ws.onmessage = (event) => {
      try {
        const command = JSON.parse(event.data) as Command
        messageCount++
        const label = command.action.toLowerCase().replace("file", " file")
        console.debug(`[ws] #${messageCount} ${label}: ${command.path}`)
        callbacks.onCommand(command)
      } catch {
        // Ignore malformed messages
      }
    }

    ws.onclose = () => {
      if (closed) return
      callbacks.onDisconnect?.()
      scheduleReconnect()
    }

    ws.onerror = (event) => {
      callbacks.onError?.(event)
    }
  }

  const scheduleReconnect = () => {
    if (closed) return

    const delay = calculateBackoff(reconnectAttempt, { maxDelay: MAX_RECONNECT_DELAY })
    reconnectAttempt++

    reconnectTimeout = setTimeout(connect, delay)
  }

  const close = () => {
    closed = true
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }
    if (ws) {
      ws.close()
      ws = null
    }
  }

  connect()

  return { close }
}
