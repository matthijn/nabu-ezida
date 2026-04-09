import { afterToolResult, isLastToolResult, systemNudge, type Nudger } from "../nudge-tools"

const prompt =
  "Use ask to resolve feedback cadence before submitting a plan. Do not call submit_plan before the user has responded."

export const askBeforeSubmitNudge: Nudger = (history) => {
  if (!afterToolResult(history)) return null
  if (!isLastToolResult(history, "start_planning")) return null
  return systemNudge(prompt)
}
