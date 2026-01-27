import type { Block } from "../../types"
import { combine, type Nudger } from "../nudge-tools"

const lastBlock = (history: Block[]): Block | undefined => history[history.length - 1]

const afterToolResult: Nudger = (history) => {
  if (lastBlock(history)?.type !== "tool_result") return null
  return ""
}

const afterUserMessage: Nudger = (history) => {
  if (lastBlock(history)?.type !== "user") return null
  return ""
}

export const baselineNudge: Nudger = combine(afterToolResult, afterUserMessage)
