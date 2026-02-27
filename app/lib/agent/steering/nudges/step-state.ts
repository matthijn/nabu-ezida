import { afterToolResult, alreadyFired, systemNudge, type Nudger } from "../nudge-tools"
import type { Files, DerivedPlan, Step } from "../../derived"
import { derive, lastPlan, hasActivePlan } from "../../derived"

export const formatStepLine = (step: Step): string =>
  step.done ? `[done] ${step.description}` : `[    ] ${step.description}`

export const formatStepProgress = (plan: DerivedPlan): string =>
  plan.steps.map(formatStepLine).join("\n")

const stepMarker = (stepIndex: number): string =>
  `[step:${stepIndex}]`

export const createStepStateNudge = (getFiles: () => Files): Nudger => (history) => {
  if (!afterToolResult(history)) return null

  const d = derive(history, getFiles())
  if (!hasActivePlan(d.plans)) return null

  const plan = lastPlan(d.plans)
  if (!plan || plan.currentStep === null) return null

  const marker = stepMarker(plan.currentStep)
  if (alreadyFired(history, marker)) return null

  const progress = formatStepProgress(plan)
  return systemNudge([marker, progress].join("\n"))
}
