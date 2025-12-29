import { useState, useCallback, useRef } from "react"
import type { AgentState, AgentMessage } from "~/lib/orchestrator"
import type { ToolHandlers } from "~/domain/llm"
import { createInitialState } from "~/lib/orchestrator"
import { runAgent } from "./orchestrator"

type UseAgentOptions = {
  toolHandlers?: ToolHandlers
}

type UseAgentResult = {
  state: AgentState
  messages: AgentMessage[]
  isRunning: boolean
  send: (message: string) => Promise<void>
  cancel: () => void
  reset: () => void
}

export const useAgent = (options: UseAgentOptions = {}): UseAgentResult => {
  const { toolHandlers = {} } = options
  const [state, setState] = useState<AgentState>(createInitialState)
  const [isRunning, setIsRunning] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const send = useCallback(
    async (message: string) => {
      if (isRunning) return

      setIsRunning(true)
      abortControllerRef.current = new AbortController()

      try {
        await runAgent(message, state, {
          toolHandlers,
          onMessage: () => {
            // Messages are part of state, updated via onStateChange
          },
          onStateChange: setState,
          signal: abortControllerRef.current.signal,
        })
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("Agent error:", err)
        }
      } finally {
        setIsRunning(false)
        abortControllerRef.current = null
      }
    },
    [state, isRunning, toolHandlers]
  )

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setIsRunning(false)
  }, [])

  const reset = useCallback(() => {
    cancel()
    setState(createInitialState())
  }, [cancel])

  return {
    state,
    messages: state.messages,
    isRunning,
    send,
    cancel,
    reset,
  }
}
