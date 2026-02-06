import type { Block, SystemBlock, EmptyNudgeBlock } from "../types"

export type NudgeBlock = {
  type: "system" | "empty"
  content: string
  context?: () => Promise<string>
}

export type Nudger = (history: Block[]) => NudgeBlock | null

export type MultiNudger = (history: Block[]) => Promise<Block[]>

export const systemNudge = (content: string): NudgeBlock => ({ type: "system", content })

export const emptyNudge = (): NudgeBlock => ({ type: "empty", content: "" })

export const withContext = (nudge: NudgeBlock, context: () => Promise<string>): NudgeBlock => ({
  ...nudge,
  context,
})

export const isEmptyNudgeBlock = (b: Block): b is EmptyNudgeBlock => b.type === "empty_nudge"

const toSystemBlock = (content: string): SystemBlock => ({ type: "system", content })

const toEmptyNudgeBlock = (): EmptyNudgeBlock => ({ type: "empty_nudge" })

const resolveNudge = async (nudge: NudgeBlock): Promise<Block> => {
  if (!nudge.context) {
    return nudge.type === "empty" ? toEmptyNudgeBlock() : toSystemBlock(nudge.content)
  }

  try {
    const ctx = await nudge.context()
    const resolved = nudge.content.replace("{context}", ctx)
    return toSystemBlock(resolved)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return toSystemBlock(`[nudge context error] ${msg}`)
  }
}

const filterNonNull = <T>(results: (T | null)[]): T[] =>
  results.filter((r): r is T => r !== null)

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

export const combine = (...nudgers: Nudger[]): Nudger => (history) => {
  for (const nudger of nudgers) {
    const result = nudger(history)
    if (result !== null) return result
  }
  return null
}

export const collect = (...nudgers: Nudger[]): MultiNudger => async (history) => {
  const results = filterNonNull(nudgers.map((n) => n(history)))
  return Promise.all(results.map(resolveNudge))
}

const getNudgeMarker = (nudge: NudgeBlock): string => nudge.content

export const withCooldown =
  (n: number, nudger: Nudger): Nudger =>
  (history) => {
    const result = nudger(history)
    if (result === null) return null
    if (firedWithin(history, getNudgeMarker(result), n)) return null
    return result
  }

export const buildToolNudge =
  (toolName: string, prompt: string): Nudger =>
  (history) => {
    if (!afterToolResult(history)) return null
    const last = history[history.length - 1]
    if (last.type !== "tool_result") return null
    if ((last as { toolName?: string }).toolName !== toolName) return null
    return systemNudge(prompt)
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
