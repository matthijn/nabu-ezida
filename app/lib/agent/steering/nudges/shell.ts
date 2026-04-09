import {
  afterToolResult,
  isLastToolResult,
  lastToolResultStatus,
  systemNudge,
  type Nudger,
} from "../nudge-tools"

const shellReminder = `**Shell error** - Review the run_local_shell tool definition for supported commands and syntax.`

export const shellNudge: Nudger = (history) => {
  if (!afterToolResult(history)) return null
  if (!isLastToolResult(history, "run_local_shell")) return null

  const status = lastToolResultStatus(history)
  return status === "error" || status === "partial" ? systemNudge(shellReminder) : null
}
