import { useSyncExternalStore, useCallback, useRef, useState } from "react"
import type { ToolHandlers, Message } from "~/lib/llm"
import type { AgentState } from "~/lib/agent"
import { step, createInitialState, createLLMCaller } from "~/lib/agent"
import {
  getThread,
  updateThread,
  pushMessage,
  subscribeToThread,
  type ThreadState,
} from "./store"
import { formatDocumentContext } from "./format"

type UseThreadOptions = {
  toolHandlers?: ToolHandlers
}

type UseThreadResult = {
  thread: ThreadState | undefined
  send: (content: string) => void
  cancel: () => void
  isExecuting: boolean
}

export const useThread = (threadId: string | null, options: UseThreadOptions = {}): UseThreadResult => {
  const { toolHandlers = {} } = options
  const abortControllerRef = useRef<AbortController | null>(null)
  const agentStateRef = useRef<AgentState>(createInitialState())
  const llmCallerRef = useRef(createLLMCaller())
  const [isExecuting, setIsExecuting] = useState(false)
  const [streaming, setStreaming] = useState("")

  const subscribe = useCallback(
    (callback: () => void) => {
      if (!threadId) return () => {}
      return subscribeToThread(threadId, callback)
    },
    [threadId]
  )

  const getSnapshot = useCallback(() => {
    if (!threadId) return undefined
    const thread = getThread(threadId)
    if (!thread) return undefined
    return { ...thread, streaming: isExecuting ? streaming : null }
  }, [threadId, isExecuting, streaming])

  const thread = useSyncExternalStore(subscribe, getSnapshot)

  const send = useCallback(
    (content: string) => {
      if (!threadId || !thread || isExecuting) return

      pushMessage(threadId, { from: thread.initiator, content })
      updateThread(threadId, { status: "executing" })
      setIsExecuting(true)
      setStreaming("")
      abortControllerRef.current = new AbortController()

      const handleChunk = (chunk: string) => {
        setStreaming((prev) => prev + chunk)
      }

      const isFirstMessage = agentStateRef.current.history.length === 0
      const hasDocumentContext = thread.documentContext !== null

      if (isFirstMessage && hasDocumentContext) {
        const systemMessage: Message = {
          role: "system",
          content: formatDocumentContext(thread.documentContext!),
        }
        agentStateRef.current = {
          ...agentStateRef.current,
          history: [systemMessage],
        }
      }

      step(agentStateRef.current, content, {
        callLLM: llmCallerRef.current,
        toolHandlers,
        onChunk: handleChunk,
        signal: abortControllerRef.current.signal,
      })
        .then((result) => {
          agentStateRef.current = result.state

          if (result.response) {
            const t = getThread(threadId)
            if (t) {
              pushMessage(threadId, { from: t.recipient, content: result.response })
            }
          }

          updateThread(threadId, { status: "done" })
        })
        .catch(() => {
          updateThread(threadId, { status: "idle" })
        })
        .finally(() => {
          setIsExecuting(false)
          setStreaming("")
        })
    },
    [threadId, thread, isExecuting, toolHandlers]
  )

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setIsExecuting(false)
    setStreaming("")
    if (threadId) {
      updateThread(threadId, { status: "idle" })
    }
  }, [threadId])

  return { thread, send, cancel, isExecuting }
}
