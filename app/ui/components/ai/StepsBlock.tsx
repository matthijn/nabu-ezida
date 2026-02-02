"use client"

import {
  FeatherAlertTriangle,
  FeatherArrowRight,
  FeatherCheck,
  FeatherCircle,
  FeatherLightbulb,
  FeatherLoader2,
  FeatherX,
} from "@subframe/core"
import { InlineMarkdown } from "~/ui/components/InlineMarkdown"

type StepType = "direction" | "completed" | "discovery" | "active" | "pending" | "cancelled"

type StepItem = {
  type: StepType
  content: string
  summary?: string | null
}

type MarkdownContext = {
  projectId: string | null
  navigate?: (url: string) => void
}

const stepIcons: Record<StepType, React.ReactNode> = {
  direction: <FeatherArrowRight className="text-body text-neutral-400 mt-0.5 flex-none" />,
  completed: <FeatherCheck className="text-body text-success-600 mt-0.5 flex-none" />,
  discovery: <FeatherLightbulb className="text-body text-brand-600 mt-0.5 flex-none" />,
  active: <FeatherLoader2 className="text-body text-brand-600 mt-0.5 flex-none animate-spin" />,
  pending: <FeatherCircle className="text-body text-neutral-300 mt-0.5 flex-none" />,
  cancelled: <FeatherX className="text-body text-neutral-400 mt-0.5 flex-none" />,
}

const stepTextStyles: Record<StepType, string> = {
  direction: "text-body font-body text-default-font",
  completed: "text-body font-body text-default-font",
  discovery: "text-body font-body text-default-font",
  active: "text-body font-body text-brand-700",
  pending: "text-body font-body text-neutral-400",
  cancelled: "text-body font-body text-neutral-400",
}

type StepRowProps = {
  step: StepItem
  context: MarkdownContext
}

const StepRow = ({ step, context }: StepRowProps) => (
  <div className="flex w-full items-start gap-2">
    {stepIcons[step.type]}
    <div className="flex flex-col items-start gap-0.5">
      <span className={stepTextStyles[step.type]}>
        <InlineMarkdown projectId={context.projectId} navigate={context.navigate}>
          {step.content}
        </InlineMarkdown>
      </span>
      {step.summary && (
        <span className="text-caption font-caption text-subtext-color">
          <InlineMarkdown projectId={context.projectId} navigate={context.navigate}>
            {step.summary}
          </InlineMarkdown>
        </span>
      )}
    </div>
  </div>
)

type AbortBoxProps = {
  message?: string
}

const AbortBox = ({ message = "Pivoted plan" }: AbortBoxProps) => (
  <div className="flex w-full items-start gap-2 rounded-md border border-solid border-warning-300 bg-warning-50 px-3 py-2 mt-1">
    <FeatherAlertTriangle className="text-body text-warning-600 mt-0.5 flex-none" />
    <span className="text-body font-body text-warning-700">{message}</span>
  </div>
)

export type StepsBlockProps = {
  steps: StepItem[]
  aborted?: boolean
  projectId: string | null
  navigate?: (url: string) => void
}

const toCancelledIfAborted = (step: StepItem, aborted: boolean): StepItem =>
  aborted && step.type === "active" ? { ...step, type: "cancelled" } : step

export const StepsBlock = ({ steps, aborted, projectId, navigate }: StepsBlockProps) => {
  const context: MarkdownContext = { projectId, navigate }
  const displaySteps = steps.map((step) => toCancelledIfAborted(step, !!aborted))

  return (
    <div className="flex w-full flex-col items-start gap-2 rounded-lg bg-neutral-50 px-3 py-3">
      {displaySteps.map((step, i) => (
        <StepRow key={i} step={step} context={context} />
      ))}
      {aborted && <AbortBox />}
    </div>
  )
}

export { StepRow }
export type { StepItem, StepType }
