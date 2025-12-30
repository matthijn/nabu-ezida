import { useState, useCallback, useRef } from "react"
import type { ToolHandlers } from "~/lib/llm"
import type { AgentState } from "./types"
import { createInitialState } from "./types"
import { step } from "./step"
import { createLLMCaller } from "./llm"

type UseAgentOptions = {
  toolHandlers?: ToolHandlers
  onChunk?: (chunk: string) => void
}

type UseAgentResult = {
  state: AgentState
  isRunning: boolean
  send: (message: string) => Promise<void>
  cancel: () => void
  reset: () => void
}

export const useAgent = (options: UseAgentOptions = {}): UseAgentResult => {
  const { toolHandlers, onChunk } = options
  const [state, setState] = useState<AgentState>(createInitialState)
  const [isRunning, setIsRunning] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const llmCallerRef = useRef(createLLMCaller())

  const send = useCallback(
    async (message: string) => {
      if (isRunning) return

      setIsRunning(true)
      abortControllerRef.current = new AbortController()

      try {
        const result = await step(state, message, {
          callLLM: llmCallerRef.current,
          toolHandlers,
          onChunk,
          signal: abortControllerRef.current.signal,
        })
        setState(result.state)
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("Agent error:", err)
        }
      } finally {
        setIsRunning(false)
        abortControllerRef.current = null
      }
    },
    [state, isRunning, toolHandlers, onChunk]
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
    isRunning,
    send,
    cancel,
    reset,
  }
}
