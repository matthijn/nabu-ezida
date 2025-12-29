import { useSyncExternalStore, useCallback, useRef } from "react"
import type { ToolHandlers } from "~/domain/llm"
import type { AgentMessage, AgentState } from "~/lib/orchestrator"
import { runAgent } from "~/lib/agent"
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
  toolHandlers?: ToolHandlers
}

type UseThreadResult = {
  thread: ThreadState | undefined
  send: (content: string) => void
  cancel: () => void
  isExecuting: boolean
}

const assertNever = (x: never): never => {
  throw new Error(`Unexpected message type: ${(x as AgentMessage).type}`)
}

const selectMessageContent = (msg: AgentMessage): string | null => {
  switch (msg.type) {
    case "text":
      return msg.content
    case "thinking":
      return msg.content
    case "task_detected":
      return `Planning: ${msg.task}`
    case "plan":
      return msg.plan.steps.map((s, i) => `${i + 1}. ${s.description}`).join("\n")
    case "step_start":
      return null
    case "step_done":
      return msg.summary
    case "stuck":
      return msg.question
    case "error":
      return `Error: ${msg.message}`
    case "done":
      return msg.summary
    default:
      return assertNever(msg)
  }
}

const isUserEcho = (isFirst: boolean, msg: AgentMessage): boolean =>
  isFirst && msg.type === "text"

const isDuplicateUserMessage = (
  lastMessage: ConversationMessage | undefined,
  content: string
): boolean =>
  lastMessage?.content === content && lastMessage?.from.type !== "llm"

const findLastTextMessage = (messages: AgentMessage[]): AgentMessage | undefined =>
  [...messages].reverse().find((m) => m.type === "text")

export const useThread = (threadId: string | null, options: UseThreadOptions = {}): UseThreadResult => {
  const { toolHandlers = {} } = options
  const abortControllerRef = useRef<AbortController | null>(null)
  const agentStateRef = useRef<AgentState | null>(null)

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

      const lastMessage = thread.messages[thread.messages.length - 1]
      if (!isDuplicateUserMessage(lastMessage, content)) {
        pushMessage(threadId, { from: thread.initiator, content })
      }

      updateThread(threadId, { status: "executing", streaming: null })
      abortControllerRef.current = new AbortController()

      const currentThread = getThread(threadId)
      if (!currentThread) return

      let isFirstMessage = true

      const handleAgentMessage = (msg: AgentMessage) => {
        if (isUserEcho(isFirstMessage, msg)) {
          isFirstMessage = false
          return
        }
        isFirstMessage = false

        const msgContent = selectMessageContent(msg)
        if (msgContent) {
          const t = getThread(threadId)
          if (t) {
            pushMessage(threadId, { from: t.recipient, content: msgContent })
          }
        }
      }

      const handleStateChange = (state: AgentState) => {
        agentStateRef.current = state
      }

      runAgent(content, agentStateRef.current, {
        toolHandlers,
        onMessage: handleAgentMessage,
        onStateChange: handleStateChange,
        signal: abortControllerRef.current.signal,
      }).then((finalState) => {
        agentStateRef.current = finalState

        const lastTextMsg = findLastTextMessage(finalState.messages)
        if (lastTextMsg?.type === "text") {
          pushSummary(threadId, {
            block_id: crypto.randomUUID(),
            summary: lastTextMsg.content.slice(0, 200),
          })
        }

        updateThread(threadId, { status: "done", streaming: null })
      }).catch(() => {
        updateThread(threadId, { status: "idle", streaming: null })
      })
    },
    [threadId, thread, isExecuting, toolHandlers]
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
