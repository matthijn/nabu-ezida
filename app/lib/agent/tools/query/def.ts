import { z } from "zod"
import type { AnyTool } from "../../executors/tool"

export const QueryArgs = z.object({
  sql: z
    .string()
    .describe("SQL query. Supports SEMANTIC('description of passages to find') for topic search."),
})

export const queryTool: AnyTool = {
  name: "query",
  description:
    "Run SQL against the project database for your own analysis. Results returned to you, not shown to the user. Max 50 rows. Use search for user-facing result pages.",
  schema: QueryArgs,
}
