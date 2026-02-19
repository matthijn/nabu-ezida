import { z } from "zod"

export const completeSubstep = {
  name: "complete_substep" as const,
  description: "Mark the current substep as done within a per-section iteration.",
  schema: z.object({}),
}
