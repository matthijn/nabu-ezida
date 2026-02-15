import { afterToolResult, withCooldown, systemNudge, type Nudger } from "../nudge-tools"
import { derive, hasActiveOrientation } from "../../derived"

const planReminder = `You are building a plan for another agent to execute. If you still have open questions for the user — ask them before writing the plan. Do not guess what the user wants. Once you have enough clarity, write the plan file and resolve. Do not execute the work — plan it.`

const basePlanNudge: Nudger = (history) => {
  if (!afterToolResult(history)) return null
  const d = derive(history)
  if (hasActiveOrientation(d.orientation)) return null
  return systemNudge(planReminder)
}

export const planNudge: Nudger = withCooldown(6, basePlanNudge)
