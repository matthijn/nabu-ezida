import { z } from "zod"

const CancelArgs = z.object({
  reason: z.string().describe("Why this task cannot continue. Be specific enough that the caller can fix the problem, delegate elsewhere, or explain it to the user."),
  need: z.string().optional().describe("What would need to change for this task to succeed. 'Provide a codebook', 'file is empty', 'clarify what code loosely means'. Gives the caller something actionable."),
})

export const cancel = {
  name: "cancel" as const,
  description: "Report that the delegated task cannot be completed.",
  schema: CancelArgs,
}
