import { z } from "zod"
import type { AnyTool } from "../../executors/tool"

export const AskArgs = z.object({
  question: z.string().describe("A focused question with enough context for the user to decide."),
  options: z
    .array(z.string())
    .min(2)
    .nullish()
    .describe(
      "Concrete, actionable choices. Omit for open-ended questions where the user types freely."
    ),
  scope: z
    .enum(["local", "codebook", "preferences"])
    .describe(
      "local = this conversation only. codebook = answer shapes how analysis is done (codes, density, granularity, which speakers/sections to code, unit of analysis, inclusion criteria). preferences = lasting non-analytical decision (user name, language, output format)."
    ),
})

export type AskScope = z.infer<typeof AskArgs>["scope"]

export const askTool: AnyTool = {
  name: "ask",
  description:
    "Ask the user a question. Every question must go through this tool — never ask in chat text. Provide options when discrete choices exist, omit for open-ended questions. Execution pauses until answered. Call once per question — earlier answers may shape later questions.",
  schema: AskArgs,
}
