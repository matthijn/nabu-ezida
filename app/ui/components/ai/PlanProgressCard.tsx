"use client"

import type { Step, PerSectionConfig } from "~/lib/agent"
import { StepsBlock, StepRow, type StepItem, type StepType } from "./StepsBlock"

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

type MarkdownContext = {
  projectId: string | null
  navigate?: (url: string) => void
}

type SectionLabelProps = {
  file: string
  indexInFile: number
  totalInFile: number
}

const SectionLabel = ({ file, indexInFile, totalInFile }: SectionLabelProps) => (
  <div className="text-caption font-caption text-subtext-color mb-1">
    Processing <span className="font-medium text-default-font">{file}</span>
    {totalInFile > 1 && <span className="text-neutral-400"> · {indexInFile} of {totalInFile}</span>}
  </div>
)

type ProgressBarProps = {
  completed: number
  total: number
}

const ProgressBar = ({ completed, total }: ProgressBarProps) => {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0
  return (
    <div className="mt-2">
      <div className="h-1.5 rounded-full bg-neutral-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-brand-600 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

type PerSectionBoxProps = {
  perSection: PerSectionConfig
  steps: Step[]
  currentStep: number | null
  aborted: boolean
  context: MarkdownContext
}

const PerSectionBox = ({ perSection, steps, currentStep, aborted, context }: PerSectionBoxProps) => {
  const { firstInnerStepIndex, innerStepCount, sections, currentSection, completedSections } = perSection
  const innerSteps = steps.slice(firstInnerStepIndex, firstInnerStepIndex + innerStepCount)
  const section = sections[currentSection]

  const stepItems = innerSteps.map((step, i) =>
    toStepItem(step, currentStep, firstInnerStepIndex + i, aborted)
  )

  return (
    <div className="w-full rounded-md border border-solid border-neutral-200 bg-neutral-100 px-3 py-2">
      {section && (
        <SectionLabel
          file={section.file}
          indexInFile={section.indexInFile}
          totalInFile={section.totalInFile}
        />
      )}
      <div className="flex flex-col gap-2">
        {stepItems.map((step, i) => (
          <StepRow key={i} step={step} context={context} />
        ))}
      </div>
      <ProgressBar completed={completedSections.length} total={sections.length} />
    </div>
  )
}

type PlanProgressCardProps = {
  steps: Step[]
  currentStep: number | null
  perSection?: PerSectionConfig | null
  aborted?: boolean
  projectId: string | null
  navigate?: (url: string) => void
}

export const PlanProgressCard = ({
  steps,
  currentStep,
  perSection = null,
  aborted = false,
  projectId,
  navigate
}: PlanProgressCardProps) => {
  const context: MarkdownContext = { projectId, navigate }

  // No per_section - render flat list
  if (!perSection) {
    const stepItems = steps.map((step, i) => toStepItem(step, currentStep, i, aborted))
    return (
      <StepsBlock
        steps={stepItems}
        aborted={aborted}
        projectId={projectId}
        navigate={navigate}
      />
    )
  }

  // With per_section - split into before, per_section box, after
  const { firstInnerStepIndex, innerStepCount } = perSection
  const beforeSteps = steps.slice(0, firstInnerStepIndex)
  const afterSteps = steps.slice(firstInnerStepIndex + innerStepCount)

  const beforeItems = beforeSteps.map((step, i) => toStepItem(step, currentStep, i, aborted))
  const afterItems = afterSteps.map((step, i) =>
    toStepItem(step, currentStep, firstInnerStepIndex + innerStepCount + i, aborted)
  )

  return (
    <div className="flex w-full flex-col items-start gap-2 rounded-lg bg-neutral-50 px-3 py-3">
      {beforeItems.map((step, i) => (
        <StepRow key={`before-${i}`} step={step} context={context} />
      ))}

      <PerSectionBox
        perSection={perSection}
        steps={steps}
        currentStep={currentStep}
        aborted={aborted}
        context={context}
      />

      {afterItems.map((step, i) => (
        <StepRow key={`after-${i}`} step={step} context={context} />
      ))}

      {aborted && (
        <div className="flex w-full items-start gap-2 rounded-md border border-solid border-warning-300 bg-warning-50 px-3 py-2 mt-1">
          <span className="text-body font-body text-warning-700">Pivoted plan</span>
        </div>
      )}
    </div>
  )
}
