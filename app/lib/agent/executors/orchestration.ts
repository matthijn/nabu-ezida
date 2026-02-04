import { z } from "zod"
import { tool, registerTool, ok, err } from "./tool"

const StepSchema = z.object({
  title: z.string().min(1).describe("Brief title for this step"),
  expected: z.string().min(1).describe("What this step should produce or accomplish"),
})

const PerSectionStep = z.object({
  per_section: z
    .array(StepSchema)
    .min(1)
    .describe("Steps to repeat for each section of a large file"),
})

const StepOrPerSection = z.union([StepSchema, PerSectionStep])

const AskExpertPlan = z.object({
  expert: z.string().min(1).describe("Specialist type (e.g., qualitative-researcher)"),
  task: z.string().optional().describe("Specific task (e.g., code) - omit for freeform"),
  using: z.string().min(1).describe("Shell command to get framework/context"),
})

const CreatePlanArgs = z.object({
  task: z.string().min(1).describe("High-level description of what we're trying to accomplish"),
  steps: z.array(StepOrPerSection).min(1).describe("Ordered list of steps to complete the task"),
  files: z.array(z.string()).optional().describe("Files relevant to this task (for context)"),
  ask_expert: AskExpertPlan.optional().describe("Auto-analyze each section with expert (about comes from section)"),
})

export const createPlan = registerTool(
  tool({
    name: "create_plan",
    description: `Create an execution plan for a multi-step task.

Break complex tasks into discrete, verifiable steps. Each step should have:
- A clear title describing the action
- An expected outcome to verify completion

Use per_section for repetitive operations across file sections.`,
    schema: CreatePlanArgs,
    handler: async (_files, args) => {
      if (args.ask_expert && !args.files) {
        return err("ask_expert in plans requires files - content comes from file sections")
      }
      const stepErrors = validateSteps(args.steps)
      if (stepErrors.length > 0) return err(stepErrors.join(", "))
      return ok(null)
    },
  })
)

const CompleteStepArgs = z.object({
  summary: z.string().min(1).describe("What was accomplished in this step"),
  internal: z.string().min(1).describe("Context, findings, or notes to carry forward to later steps"),
})

export const completeStep = registerTool(
  tool({
    name: "complete_step",
    description: `Mark the current plan step as complete.

Provide a summary of what was done and any internal notes that will help with subsequent steps.`,
    schema: CompleteStepArgs,
    handler: async () => ok(null),
  })
)

const AbortArgs = z.object({
  reason: z.string().min(1).describe("Why the current step or plan cannot be completed"),
})

export const abort = registerTool(
  tool({
    name: "abort",
    description: `Abort the current plan or step.

Use when you encounter a blocking issue that prevents completion.`,
    schema: AbortArgs,
    handler: async () => ok(null),
  })
)

const StartExplorationArgs = z.object({
  question: z.string().min(1).describe("The question we're trying to answer through exploration"),
  direction: z.string().min(1).describe("Initial direction or area to investigate"),
})

export const startExploration = registerTool(
  tool({
    name: "start_exploration",
    description: `Begin an exploratory investigation.

Use when you need to understand the codebase before creating a plan. State your question and initial investigation direction.`,
    schema: StartExplorationArgs,
    handler: async () => ok(null),
  })
)

const ExplorationStepArgs = z.object({
  internal: z
    .string()
    .min(1)
    .describe("Technical details, IDs, query results to remember for next steps"),
  learned: z.string().min(1).describe("Key discoveries from this exploration step"),
  decision: z.enum(["continue", "answer", "plan"]).describe("continue exploring, answer the question, or create a plan"),
  next: z.string().optional().describe("What to investigate next (if continuing)"),
})

export const explorationStep = registerTool(
  tool({
    name: "exploration_step",
    description: `Record findings from an exploration step and decide next action.

- **continue**: Keep exploring, specify what to investigate next
- **answer**: You have enough information to answer the original question
- **plan**: You have enough information to create an execution plan`,
    schema: ExplorationStepArgs,
    handler: async () => ok(null),
  })
)

const validateSteps = (steps: z.infer<typeof StepOrPerSection>[]): string[] =>
  steps.flatMap((step, i) => {
    if ("per_section" in step) {
      return step.per_section.flatMap((item, j) => validateStep(item, `steps.${i}.per_section.${j}`))
    }
    return validateStep(step, `steps.${i}`)
  })

const validateStep = (step: z.infer<typeof StepSchema>, path: string): string[] => {
  const errors: string[] = []
  if (!step.title) errors.push(`${path}.title: required`)
  if (!step.expected) errors.push(`${path}.expected: required`)
  return errors
}
