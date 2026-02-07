import type { Block, ToolDeps } from "~/lib/agent"
import { createToolExecutor, createToNudge, isEmptyNudgeBlock } from "~/lib/agent"
import { getToolDefinitions } from "~/lib/agent/executors/tool"
import { getBlockSchemaDefinitions } from "~/domain/blocks/registry"
import { buildCaller } from "~/lib/agent/caller"
import { setStreamingContext, clearStreamingContext } from "~/lib/agent/streaming-context"
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

const STREAMING_RESET = { streaming: "", streamingToolArgs: "", streamingReasoning: "", streamingToolName: null } as const

const CANCEL_BLOCK: Block = { type: "system", content: "User cancelled the current operation. Acknowledge this briefly and ask what they'd like to do next." }

const stop = () => updateChat({ ...STREAMING_RESET, loading: false })

let active = false
let controller: AbortController | null = null
let paused = false
let cancelRequested = false
let pendingExtra: Block[] = []

export const setPaused = (v: boolean): void => { paused = v }
export const isPaused = (): boolean => paused

const buildCallbacks = () => ({
  onChunk: (chunk: string) => {
    const c = getChat()
    if (c) updateChat({ streaming: c.streaming + chunk })
  },
  onToolArgsChunk: (chunk: string) => {
    const c = getChat()
    if (c) updateChat({ streamingToolArgs: c.streamingToolArgs + chunk })
  },
  onReasoningChunk: (chunk: string) => {
    const c = getChat()
    if (c) updateChat({ streamingReasoning: c.streamingReasoning + chunk })
  },
  onToolName: (name: string) => {
    updateChat({ streamingToolArgs: "", streamingToolName: name })
  },
})

const handleCancel = (): boolean => {
  if (!cancelRequested) return false
  cancelRequested = false
  pendingExtra = [CANCEL_BLOCK]
  return true
}

const runLoop = async (deps: RunnerDeps): Promise<void> => {
  while (true) {
    const chat = getChat()
    if (!chat) return

    const extra = pendingExtra
    pendingExtra = []
    if (extra.length > 0) {
      updateChat({ history: [...chat.history, ...extra] })
    }

    controller = new AbortController()

    const base = extra.length > 0 ? getChat()! : chat
    const nudges = await toNudge(base.history)
    if (nudges.length === 0 && extra.length === 0) {
      stop()
      return
    }

    console.log("[LLM] Request started", performance.now().toFixed(0) + "ms")
    updateChat({ loading: true, error: null, streamingToolName: null })

    const nonEmpty = nudges.filter((n) => !isEmptyNudgeBlock(n))
    if (nonEmpty.length > 0) {
      const c = getChat()!
      updateChat({ history: [...c.history, ...nonEmpty] })
    }

    const current = getChat()
    if (!current) return

    const toolExecutor = createToolExecutor({ project: deps.project, navigate: deps.navigate })
    const callbacks = buildCallbacks()
    const resetStreaming = () => updateChat(STREAMING_RESET)
    setStreamingContext({ callbacks, reset: resetStreaming, signal: controller.signal })

    const caller = buildCaller("orchestrator", {
      endpoint: "/converse",
      tools: getToolDefinitions(),
      blockSchemas: getBlockSchemaDefinitions(),
      execute: toolExecutor,
      callbacks,
    })

    try {
      const history = await caller(current.history, controller.signal)
      updateChat({ history, ...STREAMING_RESET })

      if (handleCancel()) continue
      if (paused && hasToolError(history.slice(current.history.length))) {
        stop()
        return
      }
    } catch (e) {
      if (isAbortError(e)) {
        updateChat(STREAMING_RESET)
        if (handleCancel()) continue
        stop()
        return
      }
      updateChat({ error: "Something went wrong", ...STREAMING_RESET, loading: false })
      return
    }
  }
}

export const run = async (deps: RunnerDeps = {}): Promise<void> => {
  if (active) return
  active = true
  try {
    await runLoop(deps)
  } finally {
    active = false
    controller = null
    clearStreamingContext()
  }
}

export const cancel = (): void => {
  if (!active) return
  cancelRequested = true
  controller?.abort()
}
