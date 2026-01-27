import type { Block } from "../../types"
import type { Nudger } from "../nudge-tools"
import type { DerivedPlan, Step, Section, SectionResult } from "../../selectors"
import { derive, lastPlan, hasActivePlan, actionsSinceStepChange } from "../../selectors"

const STUCK_LIMIT = 10

const lastBlock = (history: Block[]): Block | undefined => history[history.length - 1]

export const planNudge: Nudger = (history, files) => {
  const d = derive(history, files)
  const plan = lastPlan(d)
  if (!plan) return null

  if (hasActivePlan(d)) {
    const actions = actionsSinceStepChange(history)
    if (actions > STUCK_LIMIT) return null
    if (actions === STUCK_LIMIT) return buildStuckNudge(plan, plan.currentStep!)
    return buildPlanNudge(plan, plan.currentStep!)
  }

  if (plan.currentStep === null && !plan.aborted && lastBlock(history)?.type === "tool_result") {
    return buildPlanCompletedNudge(plan)
  }

  return null
}

const formatCompletedStep = (step: Step): string => {
  const internalPart = step.internal ? ` [context: ${step.internal}]` : ""
  return `${step.id}. [done] ${step.description} → "${step.summary}"${internalPart}`
}

const formatPendingStep = (step: Step): string =>
  `${step.id}. [pending] ${step.description}`

const formatCurrentStep = (step: Step): string =>
  `${step.id}. [current] ${step.description}  ← current`

const formatStep = (step: Step, currentIndex: number, index: number): string => {
  if (index === currentIndex) return formatCurrentStep(step)
  return step.done ? formatCompletedStep(step) : formatPendingStep(step)
}

const formatSectionResult = (result: SectionResult): string => {
  const innerSummaries = result.innerResults
    .map((r) => {
      const ctx = r.internal ? ` [context: ${r.internal}]` : ""
      return `"${r.summary}"${ctx}`
    })
    .join(" / ")
  return `- ${result.file} ${result.indexInFile}: ${innerSummaries}`
}

const formatSectionProgress = (section: Section, sectionIndex: number, totalSections: number): string =>
  `Section ${sectionIndex + 1}/${totalSections} (${section.file} ${section.indexInFile}/${section.totalInFile})`

const formatCompletedStepList = (steps: Step[]): string =>
  steps.map((s) => formatCompletedStep(s)).join("\n")

const formatCompletedPerSection = (plan: DerivedPlan): string => {
  if (!plan.perSection || plan.perSection.completedSections.length === 0) return ""
  return `\nCompleted sections:\n${plan.perSection.completedSections.map(formatSectionResult).join("\n")}\n`
}

const buildPerSectionNudge = (plan: DerivedPlan, stepIndex: number): string => {
  const current = plan.steps[stepIndex]
  const ps = plan.perSection!
  const section = ps.sections[ps.currentSection]
  const totalSections = ps.sections.length

  const sectionProgress = formatSectionProgress(section, ps.currentSection, totalSections)

  const previousSections = ps.completedSections.length > 0
    ? `\nPrevious sections:\n${ps.completedSections.map(formatSectionResult).join("\n")}\n`
    : ""

  const stepList = plan.steps.map((s, i) => formatStep(s, stepIndex, i)).join("\n")

  return `EXECUTING STEP ${current.id}: ${current.description}
${sectionProgress}

<section>
${section.content}
</section>
${previousSections}
${stepList}

INSTRUCTIONS:
1. Process the section above
2. When DONE, call complete_step with summary of what you accomplished
3. System will advance to next step or section automatically

If blocked: call abort with reason`
}

const buildPlanNudge = (plan: DerivedPlan, stepIndex: number): string => {
  if (plan.perSection) {
    const { firstInnerStepIndex, innerStepCount } = plan.perSection
    const inPerSection = stepIndex >= firstInnerStepIndex && stepIndex < firstInnerStepIndex + innerStepCount
    if (inPerSection) {
      return buildPerSectionNudge(plan, stepIndex)
    }
  }

  const current = plan.steps[stepIndex]
  const stepList = plan.steps.map((s, i) => formatStep(s, stepIndex, i)).join("\n")

  return `EXECUTING STEP ${current.id}: ${current.description}

${stepList}

INSTRUCTIONS:
1. Execute this step using available tools
2. When DONE, call complete_step with summary of what you accomplished
3. Do NOT proceed to next step - system will prompt you

If blocked: call abort with reason`
}

const buildPlanCompletedNudge = (plan: DerivedPlan): string =>
  `PLAN COMPLETED

${formatCompletedStepList(plan.steps)}
${formatCompletedPerSection(plan)}
All steps done. Briefly summarize what was accomplished. Do NOT call any tools.`

const buildStuckNudge = (plan: DerivedPlan, stepIndex: number): string =>
  `STUCK ON STEP ${plan.steps[stepIndex].id}: ${plan.steps[stepIndex].description}

You have made too many attempts without completing this step.

You MUST now either:
1. Call complete_step if the step is actually done
2. Call abort with a clear reason why you cannot complete this step

No other actions are allowed. Choose one NOW.`
