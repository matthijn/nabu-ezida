import { type Derived, hasActivePlan, lastPlan, type DerivedPlan } from "~/lib/agent"

export type PlanStatus = {
  task: string
  current: { description: string } | null
  next: { description: string } | null
  progress: { completed: number; total: number } | null
}

const getCurrentDescription = (plan: DerivedPlan): { description: string } | null => {
  if (plan.currentStep === null) return null
  const step = plan.steps[plan.currentStep]
  return step ? { description: step.description } : null
}

const getNextDescription = (plan: DerivedPlan): { description: string } | null => {
  if (plan.currentStep === null) return null
  const next = plan.steps[plan.currentStep + 1]
  return next ? { description: next.description } : null
}

const getProgress = (plan: DerivedPlan): { completed: number; total: number } | null => {
  if (!plan.perSection) return null
  return {
    completed: plan.perSection.completedSections.length,
    total: plan.perSection.sections.length,
  }
}

export const getPlanStatus = (derived: Derived): PlanStatus | null => {
  if (!hasActivePlan(derived.plans)) return null
  const plan = lastPlan(derived.plans)!
  return {
    task: plan.task,
    current: getCurrentDescription(plan),
    next: getNextDescription(plan),
    progress: getProgress(plan),
  }
}
