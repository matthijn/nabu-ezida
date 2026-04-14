import { z } from "zod"
import type { AnyTool } from "../../executors/tool"

const StepObject = z.object({
  title: z.string().max(200),
  expected: z.string(),
  checkpoint: z.boolean().describe("Mark as a check-in moment with the user."),
})

const NestedStep = z.object({
  nested: z.array(StepObject),
})

const StepDef = z.union([StepObject, NestedStep])

export const SubmitPlanArgs = z.object({
  task: z.string().describe("High-level description of the task."),
  steps: z.array(StepDef).describe("3-7 top-level steps. Say WHAT, not HOW."),
  decisions: z.array(z.string()).optional().describe("Judgment calls made during planning."),
})

export const submitPlanTool: AnyTool = {
  name: "submit_plan",
  description:
    "Submit the agreed plan for execution. Only call after discussing the approach with the user.\n\nparallel: no — mode transition, must be solo",
  schema: SubmitPlanArgs,
}
