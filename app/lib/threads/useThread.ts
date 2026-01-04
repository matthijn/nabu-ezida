import { useSyncExternalStore, useCallback, useRef, useState, useMemo } from "react"
import type { State, Message, UserBlock, SystemBlock } from "~/lib/agent"
import { turn, createToolExecutor, initialState, blocksToMessages, getPlan, getCurrentStep, reducer } from "~/lib/agent"
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

const isPlanComplete = (history: State["history"]): boolean => {
  const plan = getPlan(history)
  return plan !== null && getCurrentStep(history) === null
}

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

      try {
        let currentState = agentStateRef.current

        const isFirstMessage = currentState.history.length === 0
        if (isFirstMessage && thread.documentContext) {
          const systemBlock: SystemBlock = { type: "system", content: formatDocumentContext(thread.documentContext) }
          currentState = reducer(currentState, systemBlock)
        }

        const userBlock: UserBlock = { type: "user", content }
        currentState = reducer(currentState, userBlock)

        let lastResponse = ""
        let lastResult: Awaited<ReturnType<typeof turn>> | null = null

        while (true) {
          const result = await turn(currentState, stateToMessages(currentState), {
            endpoint: "/chat/converse",
            execute: toolExecutor,
            callbacks: { onChunk: (chunk) => setStreaming((prev) => prev + chunk) },
            signal: abortControllerRef.current?.signal,
          })

          currentState = result.state
          lastResult = result
          agentStateRef.current = currentState
          updateThread(threadId, { plan: getPlan(currentState.history) })

          const textBlock = result.blocks.find((b) => b.type === "text")
          if (textBlock && textBlock.type === "text") {
            lastResponse = textBlock.content
          }

          if (result.action.type === "call_llm") {
            setStreaming("")
            const nudgeBlock: UserBlock = { type: "user", content: result.action.nudge }
            currentState = reducer(currentState, nudgeBlock)
            continue
          }

          break
        }

        const t = getThread(threadId)
        if (!t) return

        const plan = getPlan(currentState.history)
        if (isPlanComplete(currentState.history) && plan) {
          pushPlanMessage(threadId, t.recipient, plan)
          updateThread(threadId, { status: "done", plan: null })
        } else if (lastResult?.abortedPlan) {
          pushPlanMessage(threadId, t.recipient, lastResult.abortedPlan, true)
          updateThread(threadId, { status: "done", plan: null })
        } else {
          updateThread(threadId, { status: "done", plan })
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
