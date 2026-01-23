import { useSyncExternalStore, useCallback } from "react"
import type { Block, SystemBlock } from "~/lib/agent"
import { getChat, updateChat, subscribe, type ChatState } from "./store"
import { run, cancel as cancelRunner, type RunnerDeps } from "./runner"
import { appendBlock, appendBlocks } from "~/lib/agent"
import { getEditorContext, contextToMessage, findLastContextMessage } from "./context"

type UseChatResult = {
  chat: ChatState | null
  send: (content: string, deps?: RunnerDeps) => void
  run: (deps?: RunnerDeps) => void
  cancel: () => void
  loading: boolean
  streaming: string
  streamingToolName: string | null
  history: Block[]
  error: string | null
}

export const useChat = (): UseChatResult => {
  const chat = useSyncExternalStore(subscribe, getChat)

  const loading = chat?.loading ?? false
  const streaming = chat?.streaming ?? ""
  const streamingToolName = chat?.streamingToolName ?? null
  const history = chat?.history ?? []
  const error = chat?.error ?? null

  const send = useCallback(
    (content: string, deps?: RunnerDeps) => {
      const current = getChat()
      if (!current || current.loading) return

      const userBlock: Block = { type: "user", content }
      const blocksToAdd: Block[] = []

      const ctx = getEditorContext()
      if (ctx) {
        const formatted = contextToMessage(ctx)
        const lastSent = findLastContextMessage(current.history)
        if (formatted !== lastSent) {
          const contextBlock: SystemBlock = { type: "system", content: formatted }
          blocksToAdd.push(contextBlock)
        }
      }

      blocksToAdd.push(userBlock)
      updateChat({ history: appendBlocks(current.history, blocksToAdd) })
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

  return { chat, send, run: runChat, cancel, loading, streaming, streamingToolName, history, error }
}
