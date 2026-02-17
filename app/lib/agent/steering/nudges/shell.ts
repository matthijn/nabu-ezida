import type { Block } from "../../types"
import { afterToolResult, lastToolResultStatus, systemNudge, type Nudger } from "../nudge-tools"

const shellReminder = `**Shell error** - Review the run_local_shell tool definition for supported commands and syntax.`

const isShellResult = (history: Block[]): boolean => {
  const last = history[history.length - 1]
  return last.type === "tool_result" && (last as { toolName?: string }).toolName === "run_local_shell"
}

export const shellNudge: Nudger = (history) => {
  if (!afterToolResult(history)) return null
  if (!isShellResult(history)) return null

  const status = lastToolResultStatus(history)
  return status === "error" || status === "partial" ? systemNudge(shellReminder) : null
}
