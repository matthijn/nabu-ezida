import { afterToolResult, isLastToolResult, systemNudge, type Nudger } from "../nudge-tools"

const prompt =
  "You're in planning. Use ask for any decisions that shape the plan before submitting. Do not call submit_plan in your first message."

export const askBeforeSubmitNudge: Nudger = (history) => {
  if (!afterToolResult(history)) return null
  if (!isLastToolResult(history, "start_planning")) return null
  return systemNudge(prompt)
}
