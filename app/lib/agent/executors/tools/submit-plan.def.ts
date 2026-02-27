import { z } from "zod"
import type { AnyTool } from "../tool"

const StepObject = z.object({
  title: z.string(),
  expected: z.string(),
})

const NestedStep = z.object({
  nested: z.array(StepObject),
})

const StepDef = z.union([StepObject, NestedStep])

export const SubmitPlanArgs = z.object({
  task: z.string().describe("High-level description of the task."),
  steps: z.array(StepDef).describe("3-7 top-level steps. Say WHAT, not HOW."),
  decisions: z.array(z.string()).optional().describe("Judgment calls made during planning."),
  ask_expert: z.object({
    expert: z.string(),
    task: z.string().optional(),
    using: z.string(),
    instructions: z.string().optional(),
  }).optional(),
})

export const submitPlanTool: AnyTool = {
  name: "submit_plan",
  description: "Submit the agreed plan for execution. Only call after discussing the approach with the user.",
  schema: SubmitPlanArgs,
}
