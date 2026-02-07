import { afterToolResult, withCooldown, systemNudge, type Nudger } from "../nudge-tools"

const toneReminder = `Remember: users see titles and names, not IDs or internal terms. Write like a colleague, not a system. Use file:// protocol to link when appropriate.`

const baseToneNudge: Nudger = (history) =>
  afterToolResult(history) ? systemNudge(toneReminder) : null

export const toneNudge = withCooldown(10, baseToneNudge)
