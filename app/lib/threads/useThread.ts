import { useSyncExternalStore, useCallback, useRef, useState, useMemo } from "react"
import type { State, Message } from "~/lib/agent"
import { turn, createToolExecutor, initialState, blocksToMessages, hasActivePlan, isPlanComplete } from "~/lib/agent"
import {
  getThread,
  updateThread,
  pushTextMessage,
  pushPlanMessage,
  subscribeToThread,
  type ThreadState,
} from "./store"
import { formatDocumentContext } from "./format"
import type { QueryResult } from "~/lib/db/types"

type QueryFn = <T = unknown>(sql: string) => Promise<QueryResult<T>>

type UseThreadOptions = {
  query?: QueryFn
}

type UseThreadResult = {
  thread: ThreadState | undefined
  send: (content: string) => void
  execute: () => void
  cancel: () => void
  isExecuting: boolean
  streaming: string | null
}

const stateToMessages = (state: State): Message[] => blocksToMessages(state.history)

const getEndpoint = (inPlan: boolean): string => (inPlan ? "/chat/execute" : "/chat/converse")

export const useThread = (threadId: string | null, options: UseThreadOptions = {}): UseThreadResult => {
  const { query } = options
  const abortControllerRef = useRef<AbortController | null>(null)
  const agentStateRef = useRef<State>(initialState)
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

  const toolExecutor = useMemo(() => createToolExecutor({ query }), [query])

  const runStep = useCallback(
    async (content: string) => {
      if (!threadId || !thread) return

      updateThread(threadId, { status: "executing" })
      setIsExecuting(true)
      setStreaming("")
      abortControllerRef.current = new AbortController()

      const isFirstMessage = agentStateRef.current.history.length === 0
      const hasDocumentContext = thread.documentContext !== null

      const systemMessages: Message[] = []
      if (isFirstMessage && hasDocumentContext) {
        systemMessages.push({
          role: "system",
          content: formatDocumentContext(thread.documentContext!),
        })
      }

      const userMessage: Message = { role: "user", content }

      try {
        let currentState = agentStateRef.current
        let messages = [...systemMessages, ...stateToMessages(currentState), userMessage]
        let lastResponse = ""
        let lastResult: Awaited<ReturnType<typeof turn>> | null = null

        while (true) {
          const inPlan = hasActivePlan(currentState)
          const endpoint = getEndpoint(inPlan)

          const result = await turn(currentState, messages, {
            endpoint,
            execute: toolExecutor,
            callbacks: {
              onChunk: (chunk) => setStreaming((prev) => prev + chunk),
            },
            signal: abortControllerRef.current?.signal,
          })

          currentState = result.state
          lastResult = result
          agentStateRef.current = currentState
          updateThread(threadId, { plan: currentState.plan })

          const textBlock = result.blocks.find((b) => b.type === "text")
          if (textBlock && textBlock.type === "text") {
            lastResponse = textBlock.content
          }

          if (result.action.type === "call_llm") {
            setStreaming("")
            messages = [
              ...systemMessages,
              ...stateToMessages(currentState),
              { role: "user", content: result.action.nudge },
            ]
            continue
          }

          break
        }

        const t = getThread(threadId)
        if (!t) return

        if (isPlanComplete(currentState) && currentState.plan) {
          pushPlanMessage(threadId, t.recipient, currentState.plan)
          agentStateRef.current = { ...agentStateRef.current, plan: null }
          updateThread(threadId, { status: "done", plan: null })
        } else if (lastResult?.abortedPlan) {
          pushPlanMessage(threadId, t.recipient, lastResult.abortedPlan, true)
          updateThread(threadId, { status: "done", plan: null })
        } else {
          updateThread(threadId, { status: "done", plan: currentState.plan })
        }

        if (lastResponse) {
          pushTextMessage(threadId, t.recipient, lastResponse)
        }
      } catch {
        updateThread(threadId, { status: "idle" })
      } finally {
        setIsExecuting(false)
        setStreaming("")
      }
    },
    [threadId, thread, toolExecutor]
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
