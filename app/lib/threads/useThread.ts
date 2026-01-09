import { useSyncExternalStore, useCallback } from "react"
import type { Block } from "~/lib/agent"
import { getThread, updateThread, subscribeToThread, type ThreadState } from "./store"
import { start, cancel as cancelRunner, isRunning, type RunnerDeps } from "./runner"

type UseThreadResult = {
  thread: ThreadState | undefined
  send: (content: string, deps?: RunnerDeps) => void
  execute: (deps?: RunnerDeps) => void
  cancel: () => void
  isExecuting: boolean
  streaming: string | null
  history: Block[]
}

export const useThread = (threadId: string | null): UseThreadResult => {
  const subscribe = useCallback(
    (callback: () => void) => (threadId ? subscribeToThread(threadId, callback) : () => {}),
    [threadId]
  )

  const getSnapshot = useCallback(
    () => (threadId ? getThread(threadId) : undefined),
    [threadId]
  )

  const thread = useSyncExternalStore(subscribe, getSnapshot)

  const isExecuting = threadId ? isRunning(threadId) : false
  const streaming = isExecuting ? (thread?.streaming ?? null) : null
  const history = thread?.agentHistory ?? []

  const send = useCallback(
    (content: string, deps?: RunnerDeps) => {
      if (!threadId || !thread || isExecuting) return
      const userBlock: Block = { type: "user", content }
      updateThread(threadId, { agentHistory: [...thread.agentHistory, userBlock] })
      start(threadId, deps)
    },
    [threadId, thread, isExecuting]
  )

  const execute = useCallback(
    (deps?: RunnerDeps) => {
      if (!threadId || !thread || isExecuting) return
      start(threadId, deps)
    },
    [threadId, thread, isExecuting]
  )

  const cancel = useCallback(() => {
    if (threadId) cancelRunner(threadId)
  }, [threadId])

  return { thread, send, execute, cancel, isExecuting, streaming, history }
}
