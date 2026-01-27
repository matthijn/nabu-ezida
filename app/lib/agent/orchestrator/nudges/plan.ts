import type { Block } from "../../types"
import type { Nudger } from "../nudge-tools"
import type { DerivedPlan, Step, Section, SectionResult } from "../../selectors"
import { derive, lastPlan, hasActivePlan, actionsSinceStepChange } from "../../selectors"

const STUCK_LIMIT = 10

const lastBlock = (history: Block[]): Block | undefined => history[history.length - 1]

export const planNudge: Nudger = (history, files, _emptyNudge) => {
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

const formatCurrentStep = (step: Step): string => {
  const expectedPart = step.expected ? `\n   expected: "${step.expected}"` : ""
  return `${step.id}. [current] ${step.description}  ← current${expectedPart}`
}

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

type ResultEntry = {
  stepId: string
  description: string
  expected: string | null
  section: string | null  // e.g., "doc.md 1/2" or null for regular steps
  summary: string | null
  internal: string | null
}

const collectResults = (plan: DerivedPlan): ResultEntry[] => {
  const results: ResultEntry[] = []
  const ps = plan.perSection

  for (const step of plan.steps) {
    if (!step.done) continue

    // Check if this step is a per_section inner step
    if (ps) {
      const { firstInnerStepIndex, innerStepCount } = ps
      const stepIndex = plan.steps.indexOf(step)
      const isInnerStep = stepIndex >= firstInnerStepIndex && stepIndex < firstInnerStepIndex + innerStepCount

      if (isInnerStep) {
        // For inner steps, get results from completedSections instead
        // Only output section results once (when we hit the first inner step)
        if (stepIndex === firstInnerStepIndex) {
          const totalSections = ps.sections.length
          for (const section of ps.completedSections) {
            for (const inner of section.innerResults) {
              const innerStep = plan.steps.find((s) => s.id === inner.stepId)
              results.push({
                stepId: inner.stepId,
                description: innerStep?.description ?? "",
                expected: innerStep?.expected ?? null,
                section: `${section.file} ${section.indexInFile}/${totalSections}`,
                summary: inner.summary,
                internal: inner.internal,
              })
            }
          }
        }
        continue
      }
    }

    // Regular step
    results.push({
      stepId: step.id,
      description: step.description,
      expected: step.expected,
      section: null,
      summary: step.summary,
      internal: step.internal,
    })
  }

  return results
}

const formatResultEntry = (entry: ResultEntry): string => {
  const sectionPart = entry.section ? ` (${entry.section})` : ""
  const internalPart = entry.internal ? ` [context: ${entry.internal}]` : ""
  if (entry.expected) {
    return `${entry.stepId}. ${entry.description}${sectionPart}:\n   expected: "${entry.expected}"\n   result: "${entry.summary ?? ""}"${internalPart}`
  }
  return `${entry.stepId}. ${entry.description}${sectionPart}: "${entry.summary ?? ""}"${internalPart}`
}

const formatPlanResults = (plan: DerivedPlan): string => {
  const results = collectResults(plan)
  const lines = results.map(formatResultEntry).join("\n")
  return `<plan-results task="${plan.task}">\n${lines}\n</plan-results>`
}

const buildPerSectionNudge = (plan: DerivedPlan, stepIndex: number): string => {
  const current = plan.steps[stepIndex]
  const ps = plan.perSection!
  const section = ps.sections[ps.currentSection]
  const totalSections = ps.sections.length

  const sectionProgress = formatSectionProgress(section, ps.currentSection, totalSections)

  const previousSections = ps.completedSections.length > 0
    ? `\nPrevious section results:\n${ps.completedSections.map(formatSectionResult).join("\n")}\n`
    : ""

  const stepList = plan.steps.map((s, i) => formatStep(s, stepIndex, i)).join("\n")

  return `EXECUTING STEP ${current.id}: ${current.description}
${sectionProgress}

<section ${section.file} ${section.indexInFile}/${section.totalInFile}>
${section.content}
</section ${section.file} ${section.indexInFile}/${section.totalInFile}>
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

${formatPlanResults(plan)}

Summarize what was accomplished. Do NOT call any tools.`

const buildStuckNudge = (plan: DerivedPlan, stepIndex: number): string =>
  `STUCK ON STEP ${plan.steps[stepIndex].id}: ${plan.steps[stepIndex].description}

You have made too many attempts without completing this step.

You MUST now either:
1. Call complete_step if the step is actually done
2. Call abort with a clear reason why you cannot complete this step

No other actions are allowed. Choose one NOW.`
