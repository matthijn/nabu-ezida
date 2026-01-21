"use client"

import type { Step } from "~/lib/agent"
import { StepsBlock, type StepItem, type StepType } from "./StepsBlock"

const getStepType = (step: Step, currentIndex: number | null, stepIndex: number, aborted: boolean): StepType => {
  if (step.done) return "completed"
  if (aborted && currentIndex === stepIndex) return "cancelled"
  if (aborted) return "pending"
  if (currentIndex === stepIndex) return "active"
  return "pending"
}

const toStepItem = (step: Step, currentIndex: number | null, stepIndex: number, aborted: boolean): StepItem => ({
  type: getStepType(step, currentIndex, stepIndex, aborted),
  content: step.description,
  summary: step.summary,
})

type PlanProgressCardProps = {
  steps: Step[]
  currentStep: number | null
  aborted?: boolean
  ask?: string | null
  projectId: string | null
  navigate?: (url: string) => void
}

export const PlanProgressCard = ({ steps, currentStep, aborted = false, ask, projectId, navigate }: PlanProgressCardProps) => {
  const stepItems = steps.map((step, i) => toStepItem(step, currentStep, i, aborted))

  return (
    <StepsBlock
      steps={stepItems}
      ask={ask}
      aborted={aborted}
      projectId={projectId}
      navigate={navigate}
    />
  )
}
