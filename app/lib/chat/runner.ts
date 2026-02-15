import type { Block, BlockOrigin, ToolDeps } from "~/lib/agent"
import { createInstance } from "~/lib/agent/types"
import { createToolExecutor } from "~/lib/agent"
import { pushBlocks, tagBlocks, setActiveOrigin } from "~/lib/agent/block-store"
import { setStreamingContext, clearStreamingContext } from "~/lib/agent/streaming-context"
import { agents } from "~/lib/agent/executors/agents"
import { agentLoop } from "~/lib/agent/agent-loop"
import { getChat, updateChat } from "./store"
import { isAbortError } from "~/lib/utils"

export type RunnerDeps = ToolDeps

const STREAMING_RESET = { streaming: "", streamingToolArgs: "", streamingReasoning: "", streamingToolName: null } as const

const CANCEL_BLOCK: Block = { type: "user", content: "I cancelled the current operation." }

const stop = () => updateChat({ ...STREAMING_RESET, loading: false })

let active = false
let controller: AbortController | null = null
let cancelRequested = false
let pendingExtra: Block[] = []

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
  onStreamEnd: () => {
    updateChat(STREAMING_RESET)
  },
})

const handleCancel = (): boolean => {
  if (!cancelRequested) return false
  cancelRequested = false
  pendingExtra = [CANCEL_BLOCK]
  return true
}

let orchestratorOrigin: BlockOrigin | null = null

export const getOrchestratorOrigin = (): BlockOrigin => {
  if (!orchestratorOrigin) {
    orchestratorOrigin = { agent: "orchestrator", instance: createInstance("orchestrator") }
    setActiveOrigin(orchestratorOrigin)
  }
  return orchestratorOrigin
}

const runLoop = async (deps: RunnerDeps): Promise<void> => {
  const origin = getOrchestratorOrigin()

  while (true) {
    const chat = getChat()
    if (!chat) return

    const extra = pendingExtra
    pendingExtra = []
    if (extra.length > 0) {
      pushBlocks(tagBlocks(origin, extra))
    }

    controller = new AbortController()
    const executor = createToolExecutor(deps, origin)
    const callbacks = buildCallbacks()
    const setLoading = (loading: boolean) => updateChat({ loading })
    setStreamingContext({ callbacks, reset: () => updateChat(STREAMING_RESET), signal: controller.signal, callerOrigin: origin, setLoading })

    console.log("[LLM] Request started", performance.now().toFixed(0) + "ms")
    updateChat({ loading: true, error: null, streamingToolName: null })

    try {
      await agentLoop({
        origin,
        agent: agents.orchestrator,
        executor,
        callbacks,
        signal: controller.signal,
      })
      stop()
      return
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
    setActiveOrigin(getOrchestratorOrigin())
  }
}

export const cancel = (): void => {
  if (!active) return
  cancelRequested = true
  controller?.abort()
}
