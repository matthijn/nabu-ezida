import { z } from "zod"

const CompleteStepArgs = z.object({
  summary: z
    .string()
    .describe(
      "Brief factual debrief on the step's output 2-4 sentences." +
        "This is your main communication way do NOT talk after this, after this you WORK on next step if plan is not complete."
    ),
})

export const completeStep = {
  name: "complete_step" as const,
  description:
    "Mark the current plan step as done.\n\nparallel: yes — can fire alongside next step's work",
  schema: CompleteStepArgs,
}
