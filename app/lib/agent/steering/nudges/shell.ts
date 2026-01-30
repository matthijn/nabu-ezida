import type { Block } from "../../types"
import { afterToolResult, alreadyFired, lastToolResultStatus, type Nudger } from "../nudge-tools"
import { getShellDocs } from "../../executors/shell/shell"

const INTRO_MARKER = "## Shell Tool"
const PARTIAL_MARKER = "## SHELL: See <shell> above"

const shellFullDocs = `
<shell>
${getShellDocs()}
</shell>

Continue.
`

const shellNudgeRef = `
${PARTIAL_MARKER}
`

const hasUserMessage = (history: Block[]): boolean =>
  history.some((b) => b.type === "user")

export const shellNudge: Nudger = (history, _files, _emptyNudge) => {
  // Boot: first user message, docs not shown yet
  if (hasUserMessage(history) && !alreadyFired(history, INTRO_MARKER)) {
    return shellFullDocs
  }

  // After this point, only care about shell tool results
  if (!afterToolResult(history)) return null

  const status = lastToolResultStatus(history)
  const isShellResult =
    history[history.length - 1].type === "tool_result" &&
    (history[history.length - 1] as { toolName?: string }).toolName === "run_local_shell"

  if (!isShellResult) return null

  // Error: show full docs again
  if (status === "error") {
    return shellFullDocs
  }

  // Partial: just a nudge
  if (status === "partial") {
    return shellNudgeRef
  }

  // Ok: no nudge needed (docs already shown at boot)
  return null
}
