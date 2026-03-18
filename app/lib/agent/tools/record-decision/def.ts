import { z } from "zod"
import type { AnyTool } from "../../executors/tool"

export const RecordDecisionArgs = z.object({
  scope: z
    .enum(["codebook", "preferences"])
    .describe(
      "codebook = analytical decision (codes, density, granularity, inclusion criteria). preferences = lasting non-analytical decision (user name, language, output format)."
    ),
  summary: z
    .string()
    .describe(
      "A concise synthesis of what was decided across the preceding ask exchanges. Include the key question(s) and the agreed answer(s)."
    ),
})

export const recordDecisionTool: AnyTool = {
  name: "record_decision",
  description:
    "Persist a decision reached through ask exchanges to the codebook or preferences file. Call after one or more ask/answer rounds have converged on a decision worth recording. Not needed for local-scope asks.",
  schema: RecordDecisionArgs,
}
