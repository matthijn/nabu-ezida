import { afterToolResult, withCooldown, type Nudger } from "../nudge-tools"

const toneReminder = `Remember: users see titles and names, not IDs or internal terms. Write like a colleague, not a system.`

const baseToneNudge: Nudger = (history) =>
  afterToolResult(history) ? toneReminder : null

export const toneNudge = withCooldown(10, baseToneNudge)
