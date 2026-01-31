import { afterToolResult, type Nudger } from "../nudge-tools"

const toneReminder = `Remember: users see titles and names, not IDs or internal terms. Write like a colleague, not a system.`

export const toneNudge: Nudger = (history) =>
  afterToolResult(history) ? toneReminder : null
