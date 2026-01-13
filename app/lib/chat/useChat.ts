import { useSyncExternalStore, useCallback } from "react"
import type { Block } from "~/lib/agent"
import { getChat, updateChat, subscribe, type ChatState } from "./store"
import { run, cancel as cancelRunner, type RunnerDeps } from "./runner"
import { appendBlock } from "~/lib/agent"

type UseChatResult = {
  chat: ChatState | null
  send: (content: string, deps?: RunnerDeps) => void
  run: (deps?: RunnerDeps) => void
  cancel: () => void
  loading: boolean
  streaming: string
  history: Block[]
  error: string | null
}

export const useChat = (): UseChatResult => {
  const chat = useSyncExternalStore(subscribe, getChat)

  const loading = chat?.loading ?? false
  const streaming = chat?.streaming ?? ""
  const history = chat?.history ?? []
  const error = chat?.error ?? null

  const send = useCallback(
    (content: string, deps?: RunnerDeps) => {
      const current = getChat()
      if (!current || current.loading) return
      const userBlock: Block = { type: "user", content }
      updateChat({ history: appendBlock(current.history, userBlock) })
      run(deps)
    },
    []
  )

  const runChat = useCallback(
    (deps?: RunnerDeps) => {
      run(deps)
    },
    []
  )

  const cancel = useCallback(() => {
    cancelRunner()
  }, [])

  return { chat, send, run: runChat, cancel, loading, streaming, history, error }
}
