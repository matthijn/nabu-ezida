import { z } from "zod"

const CompleteStepArgs = z.object({
  summary: z.string().describe("What the user can't see from the document: hesitations, judgment calls, emerging patterns. Not a narration of what you wrote."),
  internal: z.string().describe("Everything the next step needs to continue: IDs, counts, decisions, context. This is the only memory from this step that carries forward — tool calls and results within the step are dropped."),
})

export const completeStep = {
  name: "complete_step" as const,
  description: "Mark the current plan step as done.",
  schema: CompleteStepArgs,
}
