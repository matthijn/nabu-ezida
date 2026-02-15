import { afterToolResult, withCooldown, systemNudge, type Nudger } from "../nudge-tools"

const planReminder = `Talk to the user first — ask about involvement, scope, and preferences. Once you have clarity, do quick structural checks if needed, then resolve with the structured plan as JSON. Do not execute the work — plan it.`

const basePlanNudge: Nudger = (history) => {
  if (!afterToolResult(history)) return null
  return systemNudge(planReminder)
}

export const planNudge: Nudger = withCooldown(6, basePlanNudge)
