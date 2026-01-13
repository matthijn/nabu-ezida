import type { DerivedPlan, DerivedExploration, Step, Finding } from "./selectors"

const formatCompletedStep = (step: Step, index: number): string =>
  `${index + 1}. [done] ${step.description} → "${step.summary}"`

const formatPendingStep = (step: Step, index: number): string =>
  `${index + 1}. [pending] ${step.description}`

const formatStep = (step: Step, index: number): string =>
  step.done ? formatCompletedStep(step, index) : formatPendingStep(step, index)

export const buildPlanNudge = (plan: DerivedPlan, stepIndex: number): string => {
  const current = plan.steps[stepIndex]
  const total = plan.steps.length

  return `EXECUTING STEP ${stepIndex + 1}/${total}: ${current.description}

${plan.steps.map(formatStep).join("\n")}

INSTRUCTIONS:
1. Execute this step using available tools
2. When DONE, call complete_step with summary of what you accomplished
3. Do NOT proceed to next step - system will prompt you

If blocked: call abort with reason`
}

const formatFinding = (finding: Finding, index: number): string =>
  `${index + 1}. [${finding.direction}] → "${finding.learned}"`

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

export const buildPlanCompletedNudge = (plan: DerivedPlan): string =>
  `PLAN COMPLETED

${plan.steps.map(formatStep).join("\n")}

All steps done. Briefly summarize what was accomplished. Do NOT call any tools.`

export const buildStuckNudge = (plan: DerivedPlan, stepIndex: number): string =>
  `STUCK ON STEP ${stepIndex + 1}/${plan.steps.length}: ${plan.steps[stepIndex].description}

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
