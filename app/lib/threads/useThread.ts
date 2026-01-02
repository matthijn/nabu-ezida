import { useSyncExternalStore, useCallback, useRef, useState } from "react"
import type { ToolHandlers, Message } from "~/lib/llm"
import type { AgentState } from "~/lib/agent"
import { step, createInitialState, createLLMCaller } from "~/lib/agent"
import {
  getThread,
  updateThread,
  pushTextMessage,
  pushPlanMessage,
  subscribeToThread,
  type ThreadState,
  type TextMessage,
} from "./store"
import { formatDocumentContext } from "./format"

type UseThreadOptions = {
  toolHandlers?: ToolHandlers
}

type UseThreadResult = {
  thread: ThreadState | undefined
  send: (content: string) => void
  execute: () => void
  cancel: () => void
  isExecuting: boolean
  streaming: string | null
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
    return getThread(threadId)
  }, [threadId])

  const thread = useSyncExternalStore(subscribe, getSnapshot)
  const streamingContent = isExecuting ? streaming : null

  const runStep = useCallback(
    (content: string) => {
      if (!threadId || !thread) return

      updateThread(threadId, { status: "executing" })
      setIsExecuting(true)
      setStreaming("")
      abortControllerRef.current = new AbortController()

      const handleChunk = (chunk: string) => {
        setStreaming((prev) => prev + chunk)
      }

      const handlePlanChange = (plan: typeof agentStateRef.current.plan) => {
        updateThread(threadId, { plan })
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
        onPlanChange: handlePlanChange,
        signal: abortControllerRef.current.signal,
      })
        .then((result) => {
          agentStateRef.current = result.state
          const t = getThread(threadId)
          if (!t) return

          const completedPlan = result.state.plan
          const allStepsDone = completedPlan?.steps.every(s => s.status === "done")

          if (allStepsDone && completedPlan) {
            pushPlanMessage(threadId, t.recipient, completedPlan)
            agentStateRef.current = { ...agentStateRef.current, plan: null }
            updateThread(threadId, { status: "done", plan: null })
          } else {
            updateThread(threadId, { status: "done", plan: result.state.plan })
          }

          if (result.response) {
            pushTextMessage(threadId, t.recipient, result.response)
          }
        })
        .catch(() => {
          updateThread(threadId, { status: "idle" })
        })
        .finally(() => {
          setIsExecuting(false)
          setStreaming("")
        })
    },
    [threadId, thread, toolHandlers]
  )

  const send = useCallback(
    (content: string) => {
      if (!threadId || !thread || isExecuting) return
      pushTextMessage(threadId, thread.initiator, content)
      runStep(content)
    },
    [threadId, thread, isExecuting, runStep]
  )

  const execute = useCallback(() => {
    if (!threadId || !thread || isExecuting) return
    const lastMessage = thread.messages[thread.messages.length - 1]
    if (!lastMessage || lastMessage.type !== "text") return
    runStep(lastMessage.content)
  }, [threadId, thread, isExecuting, runStep])

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setIsExecuting(false)
    setStreaming("")
    if (threadId) {
      updateThread(threadId, { status: "idle" })
    }
  }, [threadId])

  return { thread, send, execute, cancel, isExecuting, streaming: streamingContent }
}
