import type { SystemBlock, Block } from "~/lib/agent"
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

const appendNudges = (history: Block[], nudges: string[]): Block[] =>
  nudges.reduce((h, content) => appendBlock(h, { type: "system", content } as SystemBlock), history)

export const run = async (deps: RunnerDeps = {}): Promise<void> => {
  const chat = getChat()
  if (!chat) return
  if (chat.loading) return

  const nudges = toNudge(chat.history)
  if (nudges.length === 0) {
    controller = null
    return
  }

  if (!controller) {
    controller = new AbortController()
  }
  updateChat({ loading: true, error: null, streamingToolName: null })

  const nonEmpty = nudges.filter((n) => n !== "")
  if (nonEmpty.length > 0) {
    updateChat({ history: appendNudges(chat.history, nonEmpty) })
  }

  const current = getChat()
  if (!current) return

  const toolExecutor = createToolExecutor({ project: deps.project, navigate: deps.navigate })

  const messages = blocksToMessages(current.history)
  const counts = messages.reduce<Record<string, number>>((acc, m) => {
    acc[m.type] = (acc[m.type] ?? 0) + 1
    return acc
  }, {})
  const summary = Object.entries(counts).map(([t, n]) => `${n} ${t}`).join(", ")
  console.log(`[Runner] Sending ${messages.length} messages: ${summary}`)

  try {
    const history = await turn(current.history, messages, {
      endpoint: "/converse",
      execute: toolExecutor,
      signal: controller.signal,
      callbacks: {
        onChunk: (chunk) => {
          const c = getChat()
          if (c) updateChat({ streaming: c.streaming + chunk })
        },
        onToolName: (name) => {
          console.log(`[Tool] streaming: ${name}`)
          updateChat({ streamingToolName: name })
        },
      },
    })

    updateChat({ history, streaming: "", streamingToolName: null, loading: false })
    run(deps)
  } catch (e) {
    controller = null
    if (isAbortError(e)) {
      updateChat({ streaming: "", streamingToolName: null, loading: false })
      return
    }
    console.error("[Runner] Error:", e)
    updateChat({ error: "Something went wrong", streaming: "", streamingToolName: null, loading: false })
  }
}

export const cancel = (): void => {
  controller?.abort()
}
