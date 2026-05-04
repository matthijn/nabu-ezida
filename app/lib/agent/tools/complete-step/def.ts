import { z } from "zod"

const CompleteStepArgs = z.object({})

export const completeStep = {
  name: "complete_step" as const,
  description:
    "Mark the current plan step as done. Speak before calling — this is a bare signal.\n\nparallel: yes — can fire alongside next step's work",
  schema: CompleteStepArgs,
}
