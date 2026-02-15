import { useSyncExternalStore, useCallback } from "react"
import type { Block, SystemBlock } from "~/lib/agent"
import { getAllBlocks, subscribeBlocks, pushBlocks, tagBlocks, getActiveOrigin } from "~/lib/agent/block-store"
import { getChat, subscribe, type ChatState } from "./store"
import { run, cancel as cancelRunner, type RunnerDeps } from "./runner"
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
      if (!current) return

      const userBlock: Block = { type: "user", content }
      const blocksToAdd: Block[] = []

      const ctx = getEditorContext()
      if (ctx) {
        const formatted = contextToMessage(ctx)
        const lastSent = findLastContextMessage(getAllBlocks())
        if (formatted !== lastSent) {
          const contextBlock: SystemBlock = { type: "system", content: formatted }
          blocksToAdd.push(contextBlock)
        }
      }

      blocksToAdd.push(userBlock)
      const origin = getActiveOrigin()
      if (!origin) return
      pushBlocks(tagBlocks(origin, blocksToAdd))
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
