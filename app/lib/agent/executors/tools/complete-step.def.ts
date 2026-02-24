import { z } from "zod"

const CompleteStepArgs = z.object({
  summary: z.string().optional().describe("Observations, uncertainties, or judgment calls — the user sees the document, don't inventory it."),
  internal: z.string().optional().describe("Context, IDs, or findings to carry forward to later steps. Not shown to user."),
})

export const completeStep = {
  name: "complete_step" as const,
  description: "Mark the current plan step as done.",
  schema: CompleteStepArgs,
}
