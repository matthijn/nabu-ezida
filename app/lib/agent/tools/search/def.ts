import { z } from "zod"
import type { AnyTool } from "../../executors/tool"
import { normalizeLlmSql } from "~/lib/sql/normalize"

export const SearchArgs = z.object({
  title: z
    .string()
    .describe("Short 2-4 word label, e.g. 'Interview documents', 'Frustration mentions'"),
  description: z.string().describe("Human-readable summary of what was searched for"),
  sql: z
    .string()
    .describe(
      "SQL query. Must SELECT file. Optionally id and/or text. Use ILIKE only for verbatim strings (names, dates, specific terms). For meanings, paraphrases, synonyms, or concepts — use SEMANTIC('passage description'). Stacking multiple ILIKE variants to cover wording is a signal you want SEMANTIC instead."
    )
    .transform(normalizeLlmSql),
  highlight: z
    .string()
    .describe(
      "What to highlight in each result chunk. Describes the relevant passages to extract and show to the user."
    ),
})

export const searchTool: AnyTool = {
  name: "search",
  description:
    "Search the project database and persist results as a browsable page the user can revisit. Not for counting or aggregation — use query for those.\n\nparallel: no — user-facing interaction",
  schema: SearchArgs,
}
