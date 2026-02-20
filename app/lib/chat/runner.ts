import type { BlockOrigin, ToolDeps } from "~/lib/agent"
import { createInstance } from "~/lib/agent/types"
import { createToolExecutor } from "~/lib/agent"
import { setActiveOrigin } from "~/lib/agent/block-store"
import { setStreamingContext, clearStreamingContext } from "~/lib/agent/streaming-context"
import { agentLoop } from "~/lib/agent/agent-loop"
import { waitForUser } from "~/lib/agent/executors/delegation"
import { getChat, updateChat } from "./store"
import { isAbortError } from "~/lib/utils"

export type RunnerDeps = ToolDeps

const BASE_AGENT = "qualitative-researcher"

const STREAMING_RESET = { streaming: "", streamingToolArgs: "", streamingReasoning: "", streamingToolName: null } as const

const stop = () => updateChat({ ...STREAMING_RESET, loading: false })

let active = false
let controller: AbortController | null = null

const buildCallbacks = () => {
  let reasoningStale = false

  return {
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
      if (!c) return
      const base = reasoningStale ? "" : c.streamingReasoning
      reasoningStale = false
      updateChat({ streamingReasoning: base + chunk })
    },
    onToolName: (name: string) => {
      updateChat({ streamingToolArgs: "", streamingToolName: name })
    },
    onStreamEnd: () => {
      reasoningStale = true
      updateChat({ streaming: "", streamingToolArgs: "", streamingToolName: null })
    },
  }
}

let baseOrigin: BlockOrigin | null = null

export const getBaseOrigin = (): BlockOrigin => {
  if (!baseOrigin) {
    baseOrigin = { agent: BASE_AGENT, instance: createInstance(BASE_AGENT) }
    setActiveOrigin(baseOrigin)
  }
  return baseOrigin
}

const runAgent = async (deps: RunnerDeps): Promise<void> => {
  const chat = getChat()
  if (!chat) return

  const origin = getBaseOrigin()
  controller = new AbortController()
  const executor = createToolExecutor(deps, origin)
  const callbacks = buildCallbacks()
  const setLoading = (loading: boolean) => updateChat({ loading })
  setStreamingContext({ callbacks, reset: () => updateChat(STREAMING_RESET), signal: controller.signal, callerOrigin: origin, setLoading })

  updateChat({ loading: true, error: null, streamingToolName: null })

  while (true) {
    await agentLoop({
      origin,
      executor,
      callbacks,
      signal: controller.signal,
    })
    stop()
    await waitForUser(origin, controller.signal)
    updateChat({ loading: true, error: null, streamingToolName: null })
  }
}

export const run = async (deps: RunnerDeps = {}): Promise<void> => {
  if (active) return
  active = true
  try {
    await runAgent(deps)
  } catch (e) {
    if (!isAbortError(e)) {
      updateChat({ error: "Something went wrong", ...STREAMING_RESET, loading: false })
    }
  } finally {
    active = false
    controller = null
    clearStreamingContext()
    stop()
    setActiveOrigin(getBaseOrigin())
  }
}

export const cancel = (): void => {
  if (!active) return
  controller?.abort()
}
