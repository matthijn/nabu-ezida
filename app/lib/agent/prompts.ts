import type { Plan, Step } from "./types"

const formatStepList = (steps: Step[]): string =>
  steps.map((s, i) => `${i + 1}. [${s.status}] ${s.description}`).join("\n")

export const TASK_SCHEMA = `When you identify a task that requires multiple steps, respond with JSON:
{"type": "task", "description": "clear description of what needs to be done"}

Example:
{"type": "task", "description": "Create a literature review document summarizing cognitive load theory findings from 2015-2024"}

For simple questions or responses, reply normally without JSON.`

export const PLAN_SCHEMA = `Create a plan. Respond with JSON:
{
  "type": "plan",
  "task": "what we're doing",
  "steps": [{"description": "step 1"}, {"description": "step 2"}]
}

Example:
{"type": "plan", "task": "Literature review on cognitive load theory", "steps": [{"description": "Identify key papers from references"}, {"description": "Extract methodology sections"}, {"description": "Compare findings across studies"}, {"description": "Synthesize into summary table"}]}

If you need clarification before planning:
{"type": "stuck", "question": "what you need to know"}

Example:
{"type": "stuck", "question": "Should I focus on empirical studies only, or include theoretical frameworks?"}`

export const EXECUTE_SCHEMA = `Execute the current step. When complete, respond with JSON:
{"type": "step_complete", "summary": "1-2 sentences of what was accomplished"}

Example:
{"type": "step_complete", "summary": "Identified 12 relevant papers from the reference list. Filtered to 8 empirical studies published after 2015."}

If blocked and need user input:
{"type": "stuck", "question": "specific question to proceed"}

Example:
{"type": "stuck", "question": "The methodology section in Chen et al. is behind a paywall. Should I proceed with the abstract summary or skip this paper?"}`

export const buildExecuteStepPrompt = (plan: Plan, stepIndex: number): string => {
  const step = plan.steps[stepIndex]
  const overview = formatStepList(plan.steps)
  return `Plan:
${overview}

Current step: ${stepIndex + 1}. ${step.description}

${EXECUTE_SCHEMA}`
}

export const buildPlanPrompt = (task: string): string => `Task: ${task}

${PLAN_SCHEMA}`

export const TERMINAL = {
  callLimitReached: "Step exceeded call limit",
  allStepsCompleted: "All steps completed",
} as const
