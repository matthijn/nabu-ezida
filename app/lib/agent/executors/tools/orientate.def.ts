import { z } from "zod"

const OrientateArgs = z.object({
  question: z.string().min(1).describe("The question we need to understand before acting"),
  direction: z.string().min(1).describe("Initial direction or area to investigate"),
})

export const orientate = {
  name: "orientate" as const,
  description: `Investigate a question by searching files. Delegates to a search agent that resolves with findings.`,
  schema: OrientateArgs,
}
