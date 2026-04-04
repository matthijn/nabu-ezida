import type { Block, ToolCall } from "./blocks"
import { isToolCallBlock } from "~/lib/agent/derived"
import { isDraft } from "./store"

export type NabuStatus = "idle" | "busy" | "waiting-for-ask"

const isAskToolCall = (block: Block): boolean =>
  isToolCallBlock(block) && block.calls.some((c) => c.name === "ask")

const findAskCall = (block: Block): ToolCall | undefined =>
  isToolCallBlock(block) ? block.calls.find((c) => c.name === "ask") : undefined

const hasMatchingResult = (history: Block[], callId: string): boolean =>
  history.some((b) => b.type === "tool_result" && b.callId === callId)

export const isWaitingForAsk = (history: Block[]): boolean => {
  for (let i = history.length - 1; i >= 0; i--) {
    const block = history[i]
    if (isDraft(block)) continue
    if (block.type === "text" || block.type === "user") return false
    if (isAskToolCall(block)) {
      const call = findAskCall(block)
      if (!call) return false
      return !hasMatchingResult(history, call.id)
    }
  }
  return false
}

export const getNabuStatus = (loading: boolean, history: Block[]): NabuStatus => {
  if (isWaitingForAsk(history)) return "waiting-for-ask"
  if (loading) return "busy"
  return "idle"
}
