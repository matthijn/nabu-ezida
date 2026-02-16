import { afterToolResult, firedWithin, systemNudge, type Nudger } from "../nudge-tools"
import type { Files, DerivedPlan } from "../../derived"
import { derive, lastPlan, hasActivePlan } from "../../derived"
import { formatStepProgress } from "./step-state"

const MARKER = "[plan-progress]"
const COOLDOWN = 8

const formatReminder = (plan: DerivedPlan): string => {
  const current = plan.currentStep
  if (current === null) return ""
  const total = plan.steps.length
  return [
    MARKER,
    `Step ${current + 1} of ${total}`,
    "",
    formatStepProgress(plan),
    "",
    "If you have completed the current step, call complete_step else work towards completion.",
  ].join("\n")
}

export const createPlanProgressNudge = (getFiles: () => Files): Nudger => (history) => {
  if (!afterToolResult(history)) return null
  if (firedWithin(history, MARKER, COOLDOWN)) return null

  const d = derive(history, getFiles())
  if (!hasActivePlan(d.plans)) return null

  const plan = lastPlan(d.plans)
  if (!plan || plan.currentStep === null) return null

  return systemNudge(formatReminder(plan))
}
