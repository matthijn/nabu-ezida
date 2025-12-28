import { useSyncExternalStore, useCallback, useRef } from "react"
import type { Message, ToolHandlers } from "~/domain/llm"
import { executeBlock } from "~/lib/llm/executor"
import {
  getThread,
  updateThread,
  pushMessage,
  pushSummary,
  subscribeToThread,
  type ThreadState,
  type ConversationMessage,
} from "./store"

type UseThreadOptions = {
  prompt?: string
  toolHandlers?: ToolHandlers
}

type UseThreadResult = {
  thread: ThreadState | undefined
  send: (content: string) => void
  cancel: () => void
  isExecuting: boolean
}

const toRole = (msg: ConversationMessage): "user" | "assistant" =>
  msg.from.type === "llm" ? "assistant" : "user"

const toLLMMessages = (messages: ConversationMessage[]): Message[] =>
  messages.map((m) => ({ role: toRole(m), content: m.content }))

export const useThread = (threadId: string | null, options: UseThreadOptions = {}): UseThreadResult => {
  const { prompt = "nabu", toolHandlers = {} } = options
  const abortControllerRef = useRef<AbortController | null>(null)

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

  const isExecuting = thread?.status === "executing"

  const send = useCallback(
    (content: string) => {
      if (!threadId || !thread || isExecuting) return

      // Add user message to thread (skip if it's already the last message - e.g., initial send)
      const lastMessage = thread.messages[thread.messages.length - 1]
      const isAlreadyAdded = lastMessage?.content === content && lastMessage?.from.type !== "llm"
      if (!isAlreadyAdded) {
        pushMessage(threadId, { from: thread.initiator, content })
      }

      // Update status to executing
      updateThread(threadId, { status: "executing", streaming: null })

      abortControllerRef.current = new AbortController()

      const history = toLLMMessages(thread.messages)

      executeBlock({
        prompt,
        initialMessage: content,
        history,
        sharedContext: thread.summaries,
        toolHandlers,
        onStateChange: (state) => {
          updateThread(threadId, { streaming: state.streaming || null })
        },
        signal: abortControllerRef.current.signal,
      }).then((finalState) => {
        if (finalState.status === "done") {
          const assistantMessages = finalState.messages.filter(
            (m) => m.role === "assistant" && m.content
          )
          if (assistantMessages.length > 0) {
            const lastAssistant = assistantMessages[assistantMessages.length - 1]
            if (lastAssistant.content) {
              // Add assistant response
              const currentThread = getThread(threadId)
              if (currentThread) {
                pushMessage(threadId, { from: currentThread.recipient, content: lastAssistant.content })
              }

              // Push summary
              pushSummary(threadId, {
                block_id: crypto.randomUUID(),
                summary: lastAssistant.content.slice(0, 200),
              })
            }
          }
        }

        updateThread(threadId, {
          status: finalState.status === "error" ? "idle" : "done",
          streaming: null,
        })
      })
    },
    [threadId, thread, isExecuting, prompt, toolHandlers]
  )

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    if (threadId) {
      updateThread(threadId, { status: "idle", streaming: null })
    }
  }, [threadId])

  return { thread, send, cancel, isExecuting }
}
