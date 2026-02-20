import type { BlockOrigin, ToolDeps } from "~/lib/agent"
import { createInstance } from "~/lib/agent/types"
import { createToolExecutor } from "~/lib/agent"
import { setActiveOrigin, setDraft, getDraft, clearDraft, pushBlocks, tagBlocks, setLoading } from "~/lib/agent/block-store"
import { agentLoop } from "~/lib/agent/agent-loop"
import { waitForUser } from "~/lib/agent/executors/delegation"
import { getChat } from "./store"
import { isAbortError } from "~/lib/utils"

export type RunnerDeps = ToolDeps

const BASE_AGENT = "qualitative-researcher"

const stop = () => {
  setLoading(false)
  clearDraft()
}

let active = false
let controller: AbortController | null = null

const appendToTextDraft = (origin: BlockOrigin, chunk: string): void => {
  const current = getDraft()
  const content = current?.type === "text" ? current.content + chunk : chunk
  setDraft({ type: "text", content, origin })
}

const appendToReasoningDraft = (origin: BlockOrigin, chunk: string): void => {
  const current = getDraft()
  const content = current?.type === "reasoning" ? current.content + chunk : chunk
  setDraft({ type: "reasoning", content, origin })
}

const appendToToolArgsDraft = (origin: BlockOrigin, chunk: string): void => {
  const current = getDraft()
  if (current?.type === "tool_call") {
    const call = current.calls[0]
    const argsStr = (call.args as unknown as string) + chunk
    setDraft({ type: "tool_call", calls: [{ ...call, args: argsStr as unknown as Record<string, unknown> }], origin })
    return
  }
  setDraft({ type: "tool_call", calls: [{ id: "", name: "", args: chunk as unknown as Record<string, unknown> }], origin })
}

const buildCallbacks = (origin: BlockOrigin) => ({
  onChunk: (chunk: string) => appendToTextDraft(origin, chunk),
  onReasoningChunk: (chunk: string) => appendToReasoningDraft(origin, chunk),
  onToolName: (name: string) => {
    setDraft({ type: "tool_call", calls: [{ id: "", name, args: "" as unknown as Record<string, unknown> }], origin })
  },
  onToolArgsChunk: (chunk: string) => appendToToolArgsDraft(origin, chunk),
  onStreamEnd: () => {},
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
  const callbacks = buildCallbacks(origin)
  setLoading(true)

  while (true) {
    await agentLoop({
      origin,
      executor,
      callbacks,
      signal: controller.signal,
    })
    stop()
    await waitForUser(origin, controller.signal)
    setLoading(true)
  }
}

export const run = async (deps: RunnerDeps = {}): Promise<void> => {
  if (active) return
  active = true
  try {
    await runAgent(deps)
  } catch (e) {
    if (!isAbortError(e)) {
      const origin = getBaseOrigin()
      pushBlocks(tagBlocks(origin, [{ type: "error", content: "Something went wrong" }]))
    }
  } finally {
    active = false
    controller = null
    stop()
    setActiveOrigin(getBaseOrigin())
  }
}

export const cancel = (): void => {
  if (!active) return
  controller?.abort()
}
