import type { Block, BlockOrigin, ToolDeps } from "~/lib/agent"
import { createInstance } from "~/lib/agent/types"
import { createToolExecutor, isEmptyNudgeBlock } from "~/lib/agent"
import { collect } from "~/lib/agent/steering/nudge-tools"
import { toToolDefinition } from "~/lib/agent/executors/tool"
import { getBlockSchemaDefinitions } from "~/domain/blocks/registry"
import { buildCaller } from "~/lib/agent/caller"
import { pushBlocks, tagBlocks, clearBlocks, getBlocksForInstances } from "~/lib/agent/block-store"
import { setStreamingContext, clearStreamingContext } from "~/lib/agent/streaming-context"
import { agents, buildEndpoint } from "~/lib/agent/executors/agents"
import { getChat, updateChat } from "./store"
import { isAbortError } from "~/lib/utils"

export type RunnerDeps = ToolDeps

const STREAMING_RESET = { streaming: "", streamingToolArgs: "", streamingReasoning: "", streamingToolName: null } as const

const CANCEL_BLOCK: Block = { type: "system", content: "User cancelled the current operation. Acknowledge this briefly and ask what they'd like to do next." }

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
  }
  return orchestratorOrigin
}

const readOrchestratorBlocks = (): Block[] =>
  getBlocksForInstances([getOrchestratorOrigin().instance, "user"])

const excludeReasoning = (blocks: Block[]): Block[] =>
  blocks.filter((b) => b.type !== "reasoning")

const orchestratorTools = agents.orchestrator.tools.map(toToolDefinition)

const runLoop = async (deps: RunnerDeps): Promise<void> => {
  const nudge = collect(...agents.orchestrator.nudges)
  const toNudge = (history: Block[]) => nudge(excludeReasoning(history))

  while (true) {
    const chat = getChat()
    if (!chat) return

    const extra = pendingExtra
    pendingExtra = []
    if (extra.length > 0) {
      pushBlocks(tagBlocks(getOrchestratorOrigin(), extra))
    }

    controller = new AbortController()

    const nudges = await toNudge(readOrchestratorBlocks())
    if (nudges.length === 0 && extra.length === 0) {
      stop()
      return
    }

    console.log("[LLM] Request started", performance.now().toFixed(0) + "ms")
    updateChat({ loading: true, error: null, streamingToolName: null })

    const nonEmpty = nudges.filter((n) => !isEmptyNudgeBlock(n))
    if (nonEmpty.length > 0) {
      pushBlocks(tagBlocks(getOrchestratorOrigin(), nonEmpty))
    }

    const toolExecutor = createToolExecutor({ project: deps.project, navigate: deps.navigate }, getOrchestratorOrigin())
    const callbacks = buildCallbacks()
    const resetStreaming = () => updateChat(STREAMING_RESET)
    setStreamingContext({ callbacks, reset: resetStreaming, signal: controller.signal, callerOrigin: getOrchestratorOrigin() })

    const origin = getOrchestratorOrigin()
    const caller = buildCaller(origin, {
      endpoint: buildEndpoint(agents.orchestrator),
      tools: orchestratorTools,
      blockSchemas: getBlockSchemaDefinitions(),
      execute: toolExecutor,
      callbacks,
      readBlocks: readOrchestratorBlocks,
    })

    try {
      const newBlocks = await caller(controller.signal)
      updateChat(STREAMING_RESET)

      if (handleCancel()) continue
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
    orchestratorOrigin = null
    clearStreamingContext()
  }
}

export const cancel = (): void => {
  if (!active) return
  cancelRequested = true
  controller?.abort()
}
