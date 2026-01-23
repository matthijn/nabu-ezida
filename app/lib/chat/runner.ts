import type { SystemBlock } from "~/lib/agent"
import { turn, createToolExecutor, blocksToMessages, appendBlock, toNudge } from "~/lib/agent"
import { getChat, updateChat } from "./store"
import { isAbortError } from "~/lib/utils"
import type { Project } from "~/domain/project"

type NavigateFn = (url: string) => void

export type RunnerDeps = {
  project?: Project
  navigate?: NavigateFn
}

let controller: AbortController | null = null

export const run = async (deps: RunnerDeps = {}): Promise<void> => {
  const chat = getChat()
  if (!chat) return
  if (chat.loading) return

  const nudge = toNudge(chat.history)
  if (nudge === null) {
    controller = null
    return
  }

  if (!controller) {
    controller = new AbortController()
  }
  updateChat({ loading: true, error: null })

  if (nudge !== "") {
    const nudgeBlock: SystemBlock = { type: "system", content: nudge }
    updateChat({ history: appendBlock(chat.history, nudgeBlock) })
  }

  const current = getChat()
  if (!current) return

  const toolExecutor = createToolExecutor({ project: deps.project, navigate: deps.navigate })

  try {
    const history = await turn(current.history, blocksToMessages(current.history), {
      endpoint: "/converse",
      execute: toolExecutor,
      signal: controller.signal,
      callbacks: {
        onChunk: (chunk) => {
          const c = getChat()
          if (c) updateChat({ streaming: c.streaming + chunk })
        },
      },
    })

    updateChat({ history, streaming: "", loading: false })
    run(deps)
  } catch (e) {
    controller = null
    if (isAbortError(e)) {
      updateChat({ streaming: "", loading: false })
      return
    }
    console.error("[Runner] Error:", e)
    updateChat({ error: "Something went wrong", streaming: "", loading: false })
  }
}

export const cancel = (): void => {
  controller?.abort()
}
