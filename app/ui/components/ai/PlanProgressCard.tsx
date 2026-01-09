"use client"

import { FeatherCheck, FeatherCircle, FeatherLoader2, FeatherX } from "@subframe/core"
import type { Step } from "~/lib/agent"

type StepStatus = "done" | "active" | "pending" | "canceled"

const getStepStatus = (step: Step, currentIndex: number | null, stepIndex: number, aborted: boolean): StepStatus => {
  if (step.done) return "done"
  if (aborted) return "canceled"
  if (currentIndex === stepIndex) return "active"
  return "pending"
}

const StepIcon = ({ status }: { status: StepStatus }) => {
  switch (status) {
    case "done":
      return <FeatherCheck className="text-caption text-success-600" />
    case "active":
      return <FeatherLoader2 className="text-caption text-brand-600 animate-spin" />
    case "pending":
      return <FeatherCircle className="text-caption text-neutral-400" />
    case "canceled":
      return <FeatherX className="text-caption text-neutral-400" />
  }
}

const stepTextColor: Record<StepStatus, string> = {
  done: "text-default-font",
  active: "text-default-font",
  pending: "text-neutral-400",
  canceled: "text-neutral-400 line-through",
}

type PlanProgressCardProps = {
  steps: Step[]
  currentStep: number | null
  aborted?: boolean
}

const StepRow = ({ step, status }: { step: Step; status: StepStatus }) => (
  <div className="flex w-full items-start gap-2">
    <StepIcon status={status} />
    <div className="flex flex-col items-start gap-0.5">
      <span className={`text-caption font-caption ${stepTextColor[status]}`}>
        {step.description}
      </span>
      {step.summary && (
        <span className="text-caption font-caption text-subtext-color">
          → {step.summary}
        </span>
      )}
    </div>
  </div>
)

export const PlanProgressCard = ({ steps, currentStep, aborted = false }: PlanProgressCardProps) => (
  <div className="flex w-full flex-col items-start gap-1 rounded-md bg-brand-50 px-2 py-2">
    {steps.map((step, i) => (
      <StepRow key={step.id} step={step} status={getStepStatus(step, currentStep, i, aborted)} />
    ))}
  </div>
)
