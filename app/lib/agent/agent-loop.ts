import type { Block } from "./types"
import type { ParseCallbacks } from "./stream"
import type { ToolExecutor } from "./turn"
import { toToolDefinition, toSchemaMap } from "./executors/tool"
import { buildCaller } from "./caller"
import { pushBlocks, getAllBlocks, isDraft, subscribeBlocks } from "./block-store"
import { isErrorResult, isDebugPauseBlock } from "./derived"
import { collect, isEmptyNudgeBlock } from "./steering/nudge-tools"
import { getBlockSchemaDefinitions } from "~/domain/blocks/registry"
import { extractEntityIdCandidates } from "~/domain/entity-link"
import { modes, deriveMode, ENDPOINT } from "./executors/modes"
import { getFiles } from "~/lib/files/store"
import { resolveEntityName } from "~/lib/files/selectors"
import { compactHistory, stepCompactHistory } from "./compact"

export type AgentLoopConfig = {
  executor: ToolExecutor
  callbacks?: ParseCallbacks
  signal?: AbortSignal
}

export const excludeReasoning = (blocks: Block[]): Block[] =>
  blocks.filter((b) => b.type !== "reasoning")

export const hasToolCalls = (blocks: Block[]): boolean =>
  blocks.some((b) => b.type === "tool_call")

export const extractLastText = (blocks: Block[]): string =>
  blocks.filter((b) => b.type === "text").map((b) => b.content).join("\n") || ""

export const shouldContinue = (newBlocks: Block[]): boolean =>
  hasToolCalls(newBlocks) || !extractLastText(newBlocks)

const readDebugOption = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback
  try {
    const stored = localStorage.getItem("nabu-debug-options")
    return stored ? (JSON.parse(stored)[key] ?? fallback) : fallback
  } catch {
    return fallback
  }
}

const readReasoningSummary = (): string =>
  readDebugOption("reasoningSummaryAuto", false) ? "auto" : "concise"

const readStepCompaction = (): boolean =>
  readDebugOption("stepCompaction", false)

const writeDebugOption = (key: string, value: unknown): void => {
  if (typeof window === "undefined") return
  try {
    const stored = localStorage.getItem("nabu-debug-options")
    const options = stored ? JSON.parse(stored) : {}
    localStorage.setItem("nabu-debug-options", JSON.stringify({ ...options, [key]: value }))
  } catch {}
}

const consumeForceCompaction = (): boolean => {
  const value = readDebugOption("forceCompaction", false)
  if (!value) return false
  writeDebugOption("forceCompaction", false)
  return true
}

const hasToolError = (blocks: Block[]): boolean =>
  blocks.some((b) => b.type === "tool_result" && isErrorResult(b.result))

const hasPauseBlock = (): boolean =>
  getAllBlocks().some(isDebugPauseBlock)

const awaitResume = (signal?: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    const tryResolve = () => {
      if (!hasPauseBlock()) {
        cleanup()
        resolve()
      }
    }
    const unsub = subscribeBlocks(tryResolve)
    const onAbort = () => { cleanup(); resolve() }
    const cleanup = () => {
      unsub()
      signal?.removeEventListener("abort", onAbort)
    }
    signal?.addEventListener("abort", onAbort, { once: true })
    tryResolve()
  })

const shouldPauseOnError = (blocks: Block[]): boolean =>
  hasToolError(blocks) && readDebugOption("showStreamPanel", false)

const findDanglingIds = (text: string): string[] => {
  const candidates = extractEntityIdCandidates(text)
  if (candidates.length === 0) return []
  const files = getFiles()
  return candidates.filter((id) => resolveEntityName(files, id) === null)
}

const rejectDanglingBlock = (block: Block): Block => {
  if (block.type !== "text" || isDraft(block)) return block
  const dangling = findDanglingIds(block.content)
  if (dangling.length === 0) return block
  return {
    type: "system",
    content: `Your response was rejected. These entity IDs do not exist: ${dangling.join(", ")}\nYour message was:\n${block.content}\nOnly reference entity IDs that exist in the current documents.`,
  }
}

const rejectDanglingEntityIds = (blocks: Block[]): Block[] =>
  hasToolCalls(blocks) ? blocks : blocks.map(rejectDanglingBlock)

export const agentLoop = async (config: AgentLoopConfig): Promise<void> => {
  const { executor, callbacks, signal } = config

  while (true) {
    const blocks = getAllBlocks()
    const mode = deriveMode(blocks)
    const modeConfig = modes[mode]
    const tools = modeConfig.tools.map(toToolDefinition)
    const nudge = collect(...modeConfig.nudges)

    const visible = compactHistory(blocks, getFiles())
    const nudges = await nudge(excludeReasoning(visible))
    if (nudges.length === 0) return

    const nonEmpty = nudges.filter((b) => !isEmptyNudgeBlock(b))
    if (nonEmpty.length > 0) {
      pushBlocks(nonEmpty)
    }

    const caller = buildCaller({
      endpoint: `${ENDPOINT}&reasoning_summary=${readReasoningSummary()}${consumeForceCompaction() ? "&compact=true" : ""}`,
      tools,
      toolSchemas: toSchemaMap(modeConfig.tools),
      blockSchemas: getBlockSchemaDefinitions(),
      execute: executor,
      callbacks,
      readBlocks: () => {
        const blocks = compactHistory(getAllBlocks(), getFiles())
        return readStepCompaction() ? stepCompactHistory(blocks) : blocks
      },
      transformBlocks: rejectDanglingEntityIds,
    })

    const newBlocks = await caller(signal)

    if (shouldPauseOnError(newBlocks)) {
      pushBlocks([{ type: "debug_pause" }])
      await awaitResume(signal)
    }

    if (!shouldContinue(newBlocks)) return
  }
}
