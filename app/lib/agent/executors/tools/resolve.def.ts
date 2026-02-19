import { z } from "zod"

const ResolveArgs = z.object({
  outcome: z.string().describe("The plan as a JSON string."),
})

export const resolve = {
  name: "resolve" as const,
  description: "Report successful completion of delegated task.",
  schema: ResolveArgs,
}
