import { useSyncExternalStore, useCallback } from "react"
import type { Block, BlockOrigin, SystemBlock } from "~/lib/agent"
import { createInstance } from "~/lib/agent/types"
import { getAllBlocks, subscribeBlocks, pushBlocks, tagBlocks } from "~/lib/agent/block-store"
import { getChat, subscribe, type ChatState } from "./store"
import { run, cancel as cancelRunner, getHistory, pushToHistory, type RunnerDeps } from "./runner"
import { getEditorContext, contextToMessage, findLastContextMessage } from "./context"

type UseChatResult = {
  chat: ChatState | null
  send: (content: string, deps?: RunnerDeps) => void
  run: (deps?: RunnerDeps) => void
  cancel: () => void
  loading: boolean
  streaming: string
  streamingToolArgs: string
  streamingReasoning: string
  streamingToolName: string | null
  history: Block[]
  error: string | null
}

const USER_ORIGIN: BlockOrigin = { agent: "user", instance: "user" }

export const useChat = (): UseChatResult => {
  const chat = useSyncExternalStore(subscribe, getChat)
  const history = useSyncExternalStore(subscribeBlocks, getAllBlocks, getAllBlocks)

  const loading = chat?.loading ?? false
  const streaming = chat?.streaming ?? ""
  const streamingToolArgs = chat?.streamingToolArgs ?? ""
  const streamingReasoning = chat?.streamingReasoning ?? ""
  const streamingToolName = chat?.streamingToolName ?? null
  const error = chat?.error ?? null

  const send = useCallback(
    (content: string, deps?: RunnerDeps) => {
      const current = getChat()
      if (!current || current.loading) return

      const userBlock: Block = { type: "user", content }
      const blocksToAdd: Block[] = []

      const currentHistory = getHistory()
      const ctx = getEditorContext()
      if (ctx) {
        const formatted = contextToMessage(ctx)
        const lastSent = findLastContextMessage(currentHistory)
        if (formatted !== lastSent) {
          const contextBlock: SystemBlock = { type: "system", content: formatted }
          blocksToAdd.push(contextBlock)
        }
      }

      blocksToAdd.push(userBlock)
      pushBlocks(tagBlocks(USER_ORIGIN, blocksToAdd))
      pushToHistory(blocksToAdd)
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

  return { chat, send, run: runChat, cancel, loading, streaming, streamingToolArgs, streamingReasoning, streamingToolName, history, error }
}
