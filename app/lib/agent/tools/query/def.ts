import { z } from "zod"
import type { AnyTool } from "../../executors/tool"
import { normalizeLlmSql } from "~/lib/sql/normalize"
import { SQL_ARG_DESCRIPTION } from "../sql-describe"

export const QueryArgs = z.object({
  sql: z.string().describe(SQL_ARG_DESCRIPTION).transform(normalizeLlmSql),
})

export const queryTool: AnyTool = {
  name: "query",
  description:
    "Run SQL against the project database for your own analysis. Results returned to you, not shown to the user. Max 50 rows. Use search for user-facing result pages.\n\nparallel: self=yes (if independent) / others=yes / sequential if next depends on previous result",
  schema: QueryArgs,
}
