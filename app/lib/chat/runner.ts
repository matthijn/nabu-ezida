import type { SystemBlock } from "~/lib/agent"
import { turn, createToolExecutor, blocksToMessages, appendBlock, toNudge } from "~/lib/agent"
import { getChat, updateChat } from "./store"
import type { QueryResult } from "~/lib/db/types"
import type { Project } from "~/domain/project"

type QueryFn = <T = unknown>(sql: string) => Promise<QueryResult<T>>
type NavigateFn = (url: string) => void

export type RunnerDeps = {
  query?: QueryFn
  project?: Project
  navigate?: NavigateFn
}

export const run = async (deps: RunnerDeps = {}): Promise<void> => {
  const chat = getChat()
  if (!chat) return
  if (chat.loading) return

  const nudge = toNudge(chat.history)
  if (nudge === null) return

  updateChat({ loading: true, error: null })

  if (nudge !== "") {
    const nudgeBlock: SystemBlock = { type: "system", content: nudge }
    updateChat({ history: appendBlock(chat.history, nudgeBlock) })
  }

  const current = getChat()
  if (!current) return

  const toolExecutor = createToolExecutor({ query: deps.query, project: deps.project, navigate: deps.navigate })

  try {
    const result = await turn(current.history, blocksToMessages(current.history), {
      endpoint: "/converse",
      execute: toolExecutor,
      callbacks: {
        onChunk: (chunk) => {
          const c = getChat()
          if (c) updateChat({ streaming: c.streaming + chunk })
        },
      },
    })

    updateChat({ history: result.history, streaming: "", loading: false })
    run(deps)
  } catch (e) {
    console.error("[Runner] Error:", e)
    updateChat({ error: "Something went wrong", loading: false })
  }
}

export const cancel = (): void => {
  updateChat({ loading: false })
}
