import { combine, afterToolResult, alreadyFired, firedWithin, type Nudger } from "../nudge-tools"
import { getCommandNames } from "../../executors/shell/shell"

const REMINDER_INTERVAL = 20
const INTRO_MARKER = "## SHELL AVAILABLE"
const REMINDER_MARKER = "## SHELL REMINDER"

const commandList = (): string => getCommandNames().join(", ")

const shellIntroNudge: Nudger = (history, _files, _emptyNudge) => {
  if (!afterToolResult(history)) return null
  if (alreadyFired(history, INTRO_MARKER)) return null

  return `
${INTRO_MARKER}
Shell tool available (flat file structure, no directories).
Commands: ${commandList()}
Pipes (|) and chaining (&&, ||, ;) supported. Use help for details.

Continue.
`
}

const shellReminderNudge: Nudger = (history, _files, _emptyNudge) => {
  if (!afterToolResult(history)) return null
  if (firedWithin(history, REMINDER_MARKER, REMINDER_INTERVAL)) return null

  return `
${REMINDER_MARKER}
Shell: ${commandList()}
`
}

export const shellNudge: Nudger = combine(shellIntroNudge, shellReminderNudge)
