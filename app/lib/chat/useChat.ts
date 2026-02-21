import { useSyncExternalStore, useCallback } from "react"
import type { Block, SystemBlock } from "~/lib/agent"
import { getAllBlocks, subscribeBlocks, pushBlocks, subscribeDraft, getDraft, subscribeLoading, getLoading } from "~/lib/agent/block-store"
import { getChat, subscribe, type ChatState } from "./store"
import { run, cancel as cancelRunner, type RunnerDeps } from "./runner"
import { getEditorContext, contextToMessage, findLastContextMessage } from "./context"

export type UseChatResult = {
  chat: ChatState | null
  send: (content: string, deps?: RunnerDeps) => void
  respond: (content: string) => void
  run: (deps?: RunnerDeps) => void
  cancel: () => void
  loading: boolean
  draft: Block | null
  history: Block[]
}

export const useChat = (): UseChatResult => {
  const chat = useSyncExternalStore(subscribe, getChat)
  const history = useSyncExternalStore(subscribeBlocks, getAllBlocks, getAllBlocks)
  const draft = useSyncExternalStore(subscribeDraft, getDraft, getDraft)
  const loading = useSyncExternalStore(subscribeLoading, getLoading, getLoading)

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
      pushBlocks(blocksToAdd)
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

  const respond = useCallback(
    (content: string) => {
      const userBlock: Block = { type: "user", content }
      pushBlocks([userBlock])
    },
    []
  )

  const cancel = useCallback(() => {
    cancelRunner()
  }, [])

  return { chat, send, respond, run: runChat, cancel, loading, draft, history }
}
