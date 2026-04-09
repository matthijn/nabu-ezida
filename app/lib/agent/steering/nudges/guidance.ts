import type { Block } from "../../client"
import { afterToolResult, systemNudge, type Nudger } from "../nudge-tools"

const hasToolResult = (history: Block[], toolName: string): boolean =>
  history.some(
    (b) => b.type === "tool_result" && (b as { toolName?: string }).toolName === toolName
  )

const isScoutResult = (history: Block[]): boolean => {
  const last = history[history.length - 1]
  return last.type === "tool_result" && (last as { toolName?: string }).toolName === "scout"
}

const prompt =
  "Use `get_guidance` to load relevant guidance for this task if you have not done so yet."

export const guidanceNudge: Nudger = (history) => {
  if (!afterToolResult(history)) return null
  if (!isScoutResult(history)) return null
  if (hasToolResult(history, "get_guidance")) return null
  return systemNudge(prompt)
}
