import type { SystemBlock, Block } from "~/lib/agent"
import { turn, createToolExecutor, blocksToMessages, appendBlock } from "~/lib/agent"
import { getChat, updateChat, getContextIfChanged, markContextSent } from "./store"
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

let abortController: AbortController | null = null

export const isRunning = (): boolean => abortController !== null

export const start = async (deps: RunnerDeps = {}): Promise<void> => {
  const chat = getChat()
  if (!chat) return
  if (abortController) return

  abortController = new AbortController()

  const toolExecutor = createToolExecutor({ query: deps.query, project: deps.project, navigate: deps.navigate })

  let history = chat.history

  const changedContext = getContextIfChanged()
  if (changedContext) {
    const contextBlock: SystemBlock = { type: "system", content: formatDocumentContext(changedContext) }
    history = appendBlock(history, contextBlock)
    markContextSent()
  }

  updateChat({ history, streaming: "" })

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
            updateChat({ history, streaming: streamingBuffer })
          },
        },
        signal: abortController.signal,
      })

      history = result.history
      updateChat({ history, streaming: "" })

      if (result.nudge !== null) {
        const nudgeBlock: SystemBlock = { type: "system", content: result.nudge }
        history = appendBlock(history, nudgeBlock)
        continue
      }

      break
    }
  } finally {
    abortController = null
    const currentChat = getChat()
    if (currentChat) {
      updateChat({ history: currentChat.history, streaming: "" })
    }
  }
}

export const cancel = (): void => {
  if (!abortController) return
  abortController.abort()
  abortController = null
  const chat = getChat()
  if (chat) {
    updateChat({ streaming: "" })
  }
}
