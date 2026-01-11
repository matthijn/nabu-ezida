import type { SystemBlock, Block } from "~/lib/agent"
import { turn, createToolExecutor, blocksToMessages, appendBlock } from "~/lib/agent"
import { getThread, updateThread } from "./store"
import { formatDocumentContext } from "./format"
import type { QueryResult } from "~/lib/db/types"
import type { Project } from "~/domain/project"

type QueryFn = <T = unknown>(sql: string) => Promise<QueryResult<T>>
type NavigateFn = (url: string) => void

export type RunnerDeps = {
  query?: QueryFn
  project?: Project
  navigate?: NavigateFn
}

const runningThreads = new Map<string, AbortController>()

export const isRunning = (threadId: string): boolean => runningThreads.has(threadId)

const getHistory = (threadId: string): Block[] => getThread(threadId)?.agentHistory ?? []

const syncHistory = (threadId: string, history: Block[], streaming: string): void => {
  updateThread(threadId, { agentHistory: history, streaming })
}

export const start = async (threadId: string, deps: RunnerDeps = {}): Promise<void> => {
  const thread = getThread(threadId)
  if (!thread) return
  if (runningThreads.has(threadId)) return

  const abortController = new AbortController()
  runningThreads.set(threadId, abortController)

  const toolExecutor = createToolExecutor({ query: deps.query, project: deps.project, navigate: deps.navigate })

  let history = thread.agentHistory

  const isFirstMessage = history.length === 1 && history[0].type === "user"
  if (isFirstMessage && thread.documentContext) {
    const systemBlock: SystemBlock = { type: "system", content: formatDocumentContext(thread.documentContext) }
    history = [systemBlock, history[0]]
  }

  syncHistory(threadId, history, "")

  try {
    let streamingBuffer = ""

    while (true) {
      if (abortController.signal.aborted) break

      streamingBuffer = ""
      const result = await turn(history, blocksToMessages(history), {
        endpoint: "/chat/converse",
        execute: toolExecutor,
        callbacks: {
          onChunk: (chunk) => {
            streamingBuffer += chunk
            syncHistory(threadId, history, streamingBuffer)
          },
        },
        signal: abortController.signal,
      })

      history = result.history
      syncHistory(threadId, history, "")

      if (result.nudge !== null) {
        const nudgeBlock: SystemBlock = { type: "system", content: result.nudge }
        history = appendBlock(history, nudgeBlock)
        continue
      }

      break
    }
  } finally {
    runningThreads.delete(threadId)
    syncHistory(threadId, getHistory(threadId), "")
  }
}

export const cancel = (threadId: string): void => {
  const abortController = runningThreads.get(threadId)
  if (!abortController) return

  abortController.abort()
  runningThreads.delete(threadId)
  syncHistory(threadId, getHistory(threadId), "")
}
