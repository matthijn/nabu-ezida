import { z } from "zod"
import type { AnyTool } from "../../executors/tool"
import { normalizeLlmSql } from "~/lib/sql/normalize"

export const QueryArgs = z.object({
  sql: z
    .string()
    .describe(
      "SQL query. Use ILIKE only for verbatim strings (names, dates, specific terms). For meanings, paraphrases, synonyms, or concepts — use SEMANTIC('passage description'). Stacking multiple ILIKE variants to cover wording is a signal you want SEMANTIC instead."
    )
    .transform(normalizeLlmSql),
})

export const queryTool: AnyTool = {
  name: "query",
  description:
    "Run SQL against the project database for your own analysis. Results returned to you, not shown to the user. Max 50 rows. Use search for user-facing result pages.\n\nparallel: self=yes (if independent) / others=yes / sequential if next depends on previous result",
  schema: QueryArgs,
}
