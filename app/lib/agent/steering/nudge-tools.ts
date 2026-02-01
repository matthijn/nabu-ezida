import type { Block, SystemBlock } from "../types"
import type { Files } from "../derived"

export type Nudger = (history: Block[], files: Files, emptyNudge: string) => string | null

export type MultiNudger = (history: Block[], files: Files, emptyNudge?: string) => string[]

const filterNonNull = (results: (string | null)[]): string[] =>
  results.filter((r): r is string => r !== null)

const isSystem = (block: Block): block is SystemBlock => block.type === "system"

const blocksSinceMarker = (history: Block[], marker: string): number => {
  for (let i = history.length - 1; i >= 0; i--) {
    const block = history[i]
    if (isSystem(block) && block.content.includes(marker)) {
      return history.length - 1 - i
    }
  }
  return -1
}

export const afterToolResult = (history: Block[]): boolean =>
  history.length > 0 && history[history.length - 1].type === "tool_result"

type ToolResultStatus = "ok" | "partial" | "error" | null

export const lastToolResultStatus = (history: Block[]): ToolResultStatus => {
  if (history.length === 0) return null
  const last = history[history.length - 1]
  if (last.type !== "tool_result") return null
  const result = last.result as { status?: string } | undefined
  if (!result || typeof result.status !== "string") return null
  if (result.status === "ok" || result.status === "partial" || result.status === "error") {
    return result.status
  }
  return null
}

export const alreadyFired = (history: Block[], marker: string): boolean =>
  blocksSinceMarker(history, marker) !== -1

export const firedWithin = (history: Block[], marker: string, n: number): boolean => {
  const since = blocksSinceMarker(history, marker)
  if (since === -1) return false
  return since <= n
}

export const combine = (...nudgers: Nudger[]): Nudger => (history, files, emptyNudge) => {
  for (const nudger of nudgers) {
    const result = nudger(history, files, emptyNudge)
    if (result !== null) return result
  }
  return null
}

export const collect = (...nudgers: Nudger[]): MultiNudger => (history, files, emptyNudge = "") =>
  filterNonNull(nudgers.map((n) => n(history, files, emptyNudge)))

export const withCooldown =
  (n: number, nudger: Nudger): Nudger =>
  (history, files, emptyNudge) => {
    const result = nudger(history, files, emptyNudge)
    if (result === null) return null
    if (firedWithin(history, result, n)) return null
    return result
  }

export const buildToolNudge =
  (toolName: string, prompt: string): Nudger =>
  (history) => {
    if (!afterToolResult(history)) return null
    const last = history[history.length - 1]
    if (last.type !== "tool_result") return null
    if ((last as { toolName?: string }).toolName !== toolName) return null
    return prompt
  }

export const findToolCallArgs = (history: Block[], callId: string): Record<string, unknown> | null => {
  for (let i = history.length - 1; i >= 0; i--) {
    const block = history[i]
    if (block.type === "tool_call") {
      const call = block.calls.find((c) => c.id === callId)
      if (call) return call.args
    }
  }
  return null
}
