import {
  afterToolResult,
  isToolResult,
  isLastToolResult,
  systemNudge,
  type Nudger,
} from "../nudge-tools"

const prompt =
  "Use `get_guidance` to load relevant guidance for this task if you have not done so yet."

export const guidanceNudge: Nudger = (history) => {
  if (!afterToolResult(history)) return null
  if (!isLastToolResult(history, "scout")) return null
  if (history.some((b) => isToolResult(b, "get_guidance"))) return null
  return systemNudge(prompt)
}
