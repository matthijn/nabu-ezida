import { useSyncExternalStore, useCallback } from "react"
import type { Block, SystemBlock } from "~/lib/agent"
import {
  getAllBlocksWithDraft,
  getDraft,
  subscribeBlocks,
  pushBlocks,
  subscribeLoading,
  getLoading,
} from "~/lib/agent/block-store"
import { isChatOpen, subscribe } from "./store"
import { run, cancel as cancelRunner, type RunnerDeps } from "./runner"
import { getEditorContext, contextToMessage, findLastContextMessage } from "./context"

export const useChat = () => {
  const chatOpen = useSyncExternalStore(subscribe, isChatOpen)
  const history = useSyncExternalStore(
    subscribeBlocks,
    getAllBlocksWithDraft,
    getAllBlocksWithDraft
  )
  const draft = useSyncExternalStore(subscribeBlocks, getDraft, getDraft)
  const loading = useSyncExternalStore(subscribeLoading, getLoading, getLoading)

  const send = useCallback((content: string, deps?: RunnerDeps) => {
    if (!isChatOpen()) return

    const userBlock: Block = { type: "user", content }
    const blocksToAdd: Block[] = []

    const ctx = getEditorContext()
    if (ctx) {
      const formatted = contextToMessage(ctx)
      const lastSent = findLastContextMessage(getAllBlocksWithDraft())
      if (formatted !== lastSent) {
        const contextBlock: SystemBlock = { type: "system", content: formatted }
        blocksToAdd.push(contextBlock)
      }
    }

    blocksToAdd.push(userBlock)
    pushBlocks(blocksToAdd)
    run(deps)
  }, [])

  const runChat = useCallback((deps?: RunnerDeps) => {
    run(deps)
  }, [])

  const respond = useCallback((content: string) => {
    const userBlock: Block = { type: "user", content }
    pushBlocks([userBlock])
  }, [])

  const cancel = useCallback(() => {
    cancelRunner()
  }, [])

  return { chatOpen, send, respond, run: runChat, cancel, loading, draft, history }
}
