import type { BlockOrigin, ToolDeps } from "~/lib/agent"
import { createInstance } from "~/lib/agent/types"
import { createToolExecutor } from "~/lib/agent"
import { setActiveOrigin } from "~/lib/agent/block-store"
import { setStreamingContext, clearStreamingContext } from "~/lib/agent/streaming-context"
import { agents, BASE_AGENT } from "~/lib/agent/executors/agents"
import { agentLoop } from "~/lib/agent/agent-loop"
import { getChat, updateChat } from "./store"
import { isAbortError } from "~/lib/utils"

export type RunnerDeps = ToolDeps

const STREAMING_RESET = { streaming: "", streamingToolArgs: "", streamingReasoning: "", streamingToolName: null } as const

const stop = () => updateChat({ ...STREAMING_RESET, loading: false })

let active = false
let controller: AbortController | null = null

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

  try {
    await agentLoop({
      origin,
      agent: agents[BASE_AGENT],
      executor,
      callbacks,
      signal: controller.signal,
    })
    stop()
  } catch (e) {
    if (isAbortError(e)) {
      stop()
      return
    }
    updateChat({ error: "Something went wrong", ...STREAMING_RESET, loading: false })
  }
}

export const run = async (deps: RunnerDeps = {}): Promise<void> => {
  if (active) return
  active = true
  try {
    await runAgent(deps)
  } finally {
    active = false
    controller = null
    clearStreamingContext()
    setActiveOrigin(getBaseOrigin())
  }
}

export const cancel = (): void => {
  if (!active) return
  controller?.abort()
}
