import type { Block, ToolDeps } from "~/lib/agent"
import { createToolExecutor, blocksToMessages, createToNudge, isEmptyNudgeBlock } from "~/lib/agent"
import { getToolDefinitions } from "~/lib/agent/executors/tool"
import { getBlockSchemaDefinitions } from "~/domain/blocks/registry"
import { buildCaller } from "~/lib/agent/caller"
import { getChat, updateChat } from "./store"
import { isAbortError } from "~/lib/utils"
import { getFiles } from "~/lib/files"

export type RunnerDeps = ToolDeps

const toNudge = createToNudge(getFiles)

const hasToolError = (blocks: Block[]): boolean =>
  blocks.some((b) =>
    b.type === "tool_result" &&
    ((b.result as { status?: string })?.status === "error" ||
     (b.result as { status?: string })?.status === "partial"))

let controller: AbortController | null = null
let paused = false

export const setPaused = (v: boolean): void => { paused = v }
export const isPaused = (): boolean => paused

export const run = async (deps: RunnerDeps = {}): Promise<void> => {
  const chat = getChat()
  if (!chat) return
  if (chat.loading) return

  const nudges = await toNudge(chat.history)
  if (nudges.length === 0) {
    controller = null
    return
  }

  if (!controller) {
    controller = new AbortController()
  }
  console.log("[LLM] Request started", performance.now().toFixed(0) + "ms")
  updateChat({ loading: true, error: null, streamingToolName: null })

  const nonEmpty = nudges.filter((n) => !isEmptyNudgeBlock(n))
  if (nonEmpty.length > 0) {
    updateChat({ history: [...chat.history, ...nonEmpty] })
  }

  const current = getChat()
  if (!current) return

  const toolExecutor = createToolExecutor({ project: deps.project, navigate: deps.navigate })

  const caller = buildCaller("orchestrator", {
    endpoint: "/converse",
    tools: getToolDefinitions(),
    blockSchemas: getBlockSchemaDefinitions(),
    execute: toolExecutor,
    callbacks: {
      onChunk: (chunk) => {
        const c = getChat()
        if (c) updateChat({ streaming: c.streaming + chunk })
      },
      onToolArgsChunk: (chunk) => {
        const c = getChat()
        if (c) updateChat({ streamingToolArgs: c.streamingToolArgs + chunk })
      },
      onReasoningChunk: (chunk) => {
        const c = getChat()
        if (c) updateChat({ streamingReasoning: c.streamingReasoning + chunk })
      },
      onToolName: (name) => {
        updateChat({ streamingToolArgs: "", streamingToolName: name })
      },
    },
  })

  try {
    const history = await caller(current.history, controller.signal)

    updateChat({ history, streaming: "", streamingToolArgs: "", streamingReasoning: "", streamingToolName: null, loading: false })
    if (paused && hasToolError(history.slice(current.history.length))) return
    run(deps)
  } catch (e) {
    controller = null
    if (isAbortError(e)) {
      updateChat({ streaming: "", streamingToolArgs: "", streamingReasoning: "", streamingToolName: null, loading: false })
      return
    }
    updateChat({ error: "Something went wrong", streaming: "", streamingToolArgs: "", streamingReasoning: "", streamingToolName: null, loading: false })
  }
}

export const cancel = (): void => {
  controller?.abort()
}
