import { useState, useCallback, useRef } from "react"
import type { BlockState, CompactionBlock, Message, ToolHandlers } from "./types"
import { createInitialState } from "./reducers"
import { executeBlock } from "./executor"

export type UseBlockExecutionOptions = {
  prompt: string
  history: Message[]
  sharedContext: CompactionBlock[]
  pushShared: (compaction: CompactionBlock) => void
  toolHandlers?: ToolHandlers
}

export type UseBlockExecutionResult = {
  state: BlockState
  send: (message: string) => void
  cancel: () => void
  isExecuting: boolean
}

export const useBlockExecution = (options: UseBlockExecutionOptions): UseBlockExecutionResult => {
  const { prompt, history, sharedContext, pushShared, toolHandlers = {} } = options
  const [state, setState] = useState<BlockState>(createInitialState)
  const abortControllerRef = useRef<AbortController | null>(null)

  const isExecuting = state.status === "streaming" || state.status === "awaiting_tool"

  const send = useCallback(
    (message: string) => {
      if (isExecuting) return

      abortControllerRef.current = new AbortController()

      executeBlock({
        prompt,
        initialMessage: message,
        history,
        sharedContext,
        toolHandlers,
        onStateChange: setState,
        signal: abortControllerRef.current.signal,
      }).then((finalState) => {
        if (finalState.status === "done" && finalState.messages.length > 0) {
          const lastMessage = finalState.messages[finalState.messages.length - 1]
          if (lastMessage.role === "assistant" && lastMessage.content) {
            pushShared({
              block_id: crypto.randomUUID(),
              summary: lastMessage.content.slice(0, 200),
            })
          }
        }
      })
    },
    [prompt, history, sharedContext, toolHandlers, pushShared, isExecuting]
  )

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
  }, [])

  return { state, send, cancel, isExecuting }
}
