import { afterToolResult, alreadyFired, withCooldown, systemNudge, type Nudger } from "../nudge-tools"

const MIN_HISTORY = 8

const toneReminder = `Remember: users see titles and names, not IDs or internal terms. Write like a colleague, not a system. Use file:// protocol to link when appropriate.`

const identityContent = (role: string): string =>
  `You are specifically a: ${role}\n${toneReminder}`

const baseIdentityNudge = (role: string): Nudger => (history) => {
  const content = identityContent(role)
  if (!alreadyFired(history, content)) return systemNudge(content)
  if (!afterToolResult(history)) return null
  if (history.length < MIN_HISTORY) return null
  return systemNudge(content)
}

export const identityNudge = (role: string): Nudger =>
  withCooldown(10, baseIdentityNudge(role))
