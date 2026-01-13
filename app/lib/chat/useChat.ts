import { useSyncExternalStore, useCallback } from "react"
import type { Block } from "~/lib/agent"
import { getChat, updateChat, subscribe, type ChatState } from "./store"
import { start, cancel as cancelRunner, isRunning, type RunnerDeps } from "./runner"

type UseChatResult = {
  chat: ChatState | null
  send: (content: string, deps?: RunnerDeps) => void
  execute: (deps?: RunnerDeps) => void
  cancel: () => void
  isExecuting: boolean
  streaming: string | null
  history: Block[]
}

export const useChat = (): UseChatResult => {
  const chat = useSyncExternalStore(subscribe, getChat)

  const isExecuting = isRunning()
  const streaming = isExecuting ? (chat?.streaming ?? null) : null
  const history = chat?.history ?? []

  const send = useCallback(
    (content: string, deps?: RunnerDeps) => {
      if (!chat || isExecuting) return
      const userBlock: Block = { type: "user", content }
      updateChat({ history: [...chat.history, userBlock] })
      start(deps)
    },
    [chat, isExecuting]
  )

  const execute = useCallback(
    (deps?: RunnerDeps) => {
      if (!chat || isExecuting) return
      start(deps)
    },
    [chat, isExecuting]
  )

  const cancel = useCallback(() => {
    cancelRunner()
  }, [])

  return { chat, send, execute, cancel, isExecuting, streaming, history }
}
