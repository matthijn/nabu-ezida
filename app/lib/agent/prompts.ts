import type { DerivedPlan, DerivedExploration, Step, Finding, Section, SectionResult } from "./selectors"

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

export const buildPlanNudge = (plan: DerivedPlan, stepIndex: number): string => {
  // Check if currently in per_section
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

const formatFinding = (finding: Finding, index: number): string => {
  const internalPart = finding.internal ? ` [context: ${finding.internal}]` : ""
  return `${index + 1}. [${finding.direction}] → "${finding.learned}"${internalPart}`
}

export const buildExplorationNudge = (exploration: DerivedExploration): string => {
  const hasFindings = exploration.findings.length > 0
  const direction = exploration.currentDirection
    ? `\nCurrent direction: ${exploration.currentDirection}`
    : ""

  const findings = hasFindings
    ? `\n\nFindings so far:\n${exploration.findings.map(formatFinding).join("\n")}`
    : ""

  return `EXPLORING: ${exploration.question}${direction}${findings}

INSTRUCTIONS:
1. Investigate the current direction using tools
2. Call exploration_step with:
   - learned: what you discovered (be specific)
   - decision: "continue" | "answer" | "plan"
   - next: (if continuing) your next direction

Do NOT answer directly - use decision "answer" to exit exploration first.
Each step must yield insight, not just activity.`
}

const formatCompletedStepList = (steps: Step[]): string =>
  steps.map((s) => formatCompletedStep(s)).join("\n")

const formatCompletedPerSection = (plan: DerivedPlan): string => {
  if (!plan.perSection || plan.perSection.completedSections.length === 0) return ""
  return `\nCompleted sections:\n${plan.perSection.completedSections.map(formatSectionResult).join("\n")}\n`
}

export const buildPlanCompletedNudge = (plan: DerivedPlan): string =>
  `PLAN COMPLETED

${formatCompletedStepList(plan.steps)}
${formatCompletedPerSection(plan)}
All steps done. Briefly summarize what was accomplished. Do NOT call any tools.`

export const buildStuckNudge = (plan: DerivedPlan, stepIndex: number): string =>
  `STUCK ON STEP ${plan.steps[stepIndex].id}: ${plan.steps[stepIndex].description}

You have made too many attempts without completing this step.

You MUST now either:
1. Call complete_step if the step is actually done
2. Call abort with a clear reason why you cannot complete this step

No other actions are allowed. Choose one NOW.`

export const buildExplorationStuckNudge = (exploration: DerivedExploration): string =>
  `STUCK EXPLORING: ${exploration.question}

You have made too many attempts without progress.

You MUST now call exploration_step with decision "answer" or "plan" to exit.
If you cannot answer, call abort.

No other actions are allowed. Choose one NOW.`

export const buildModeRequiredNudge = (toolNames: string[]): string =>
  `You called ${toolNames.join(", ")} but you're not in a mode.

Before using tools, you must enter explore or plan mode:
- Know the steps? → create_plan (task, steps, success criteria)
- Need to investigate? → start_exploration (question, first direction)

Tool calls in chat mode are not allowed.`
