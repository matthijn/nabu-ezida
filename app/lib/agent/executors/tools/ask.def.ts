import { z } from "zod"
import type { AnyTool } from "../tool"

export const AskQuestion = z.object({
  question: z.string().describe("A focused question with enough context for the user to decide."),
  options: z.array(z.string()).min(2).describe("Concrete, actionable choices. Each option is a direction you can act on immediately."),
})

export type AskQuestion = z.infer<typeof AskQuestion>

export const AskArgs = z.object({
  questions: z.array(AskQuestion).min(1).describe("One or more questions to present sequentially. Batch related decisions into a single call."),
})

export const askTool: AnyTool = {
  name: "ask",
  description: "Present the user with one or more choices when multiple valid approaches exist and the decision depends on their preference. Questions are shown one at a time; execution pauses until all are answered. Do not use for yes/no, open-ended feedback, or questions you can answer yourself.",
  schema: AskArgs,
}
