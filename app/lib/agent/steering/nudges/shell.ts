import { combine, afterToolResult, alreadyFired, firedWithin, type Nudger } from "../nudge-tools"
import { getCommandNames, getShellDocs } from "../../executors/shell/shell"

const REMINDER_INTERVAL = 20
const INTRO_MARKER = "## Shell Tool"
const REMINDER_MARKER = "## SHELL REMINDER"

const shellIntroNudge: Nudger = (history, _files, _emptyNudge) => {
  if (!afterToolResult(history)) return null
  if (alreadyFired(history, INTRO_MARKER)) return null

  return `
<shell>
${getShellDocs()}
</shell>

Continue.
`
}

const shellReminderNudge: Nudger = (history, _files, _emptyNudge) => {
  if (!afterToolResult(history)) return null
  if (firedWithin(history, REMINDER_MARKER, REMINDER_INTERVAL)) return null

  return `
${REMINDER_MARKER}
Shell: ${getCommandNames().join(", ")}
`
}

export const shellNudge: Nudger = combine(shellIntroNudge, shellReminderNudge)
