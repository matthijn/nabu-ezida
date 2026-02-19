import { z } from "zod"

const CompleteStepArgs = z.object({
  summary: z.string().describe("What was accomplished — visible to the user."),
  internal: z.string().optional().describe("Context, IDs, or findings to carry forward to later steps. Not shown to user."),
})

export const completeStep = {
  name: "complete_step" as const,
  description: "Mark the current plan step as done.",
  schema: CompleteStepArgs,
}
