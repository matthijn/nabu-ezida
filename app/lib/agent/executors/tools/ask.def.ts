import { z } from "zod"
import type { AnyTool } from "../tool"

export const AskArgs = z.object({
  question: z.string().describe("A focused question with enough context for the user to decide."),
  options: z.array(z.string()).min(2).describe("Concrete, actionable choices. Each option is a direction you can act on immediately."),
})

export const askTool: AnyTool = {
  name: "ask",
  description: "Present the user with a single choice when multiple valid approaches exist and the decision depends on their preference. Execution pauses until answered. Call once per question — earlier answers may shape later questions. Do not use for yes/no, open-ended feedback, or questions you can answer yourself.",
  schema: AskArgs,
}
