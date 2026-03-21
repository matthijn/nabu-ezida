import { z } from "zod"
import { SearchQuerySchema } from "~/domain/search"
import type { AnyTool } from "../../executors/tool"

export const SearchArgs = z.object({
  title: z
    .string()
    .describe(
      "Short 2-4 word label for the search, e.g. 'Interview documents', 'Frustration mentions'"
    ),
  description: z.string().describe("Human-readable summary of what was searched for"),
  queries: z
    .array(SearchQuerySchema)
    .min(1)
    .describe("SQL queries to run. Each must SELECT `file` (type file) or `file, id` (type hit)."),
})

export const searchTool: AnyTool = {
  name: "search",
  description:
    "Search the project database and persist results as a browsable page. Use for display-style results (documents matching criteria, annotations containing a term). Not for counting or aggregation — use run_local_shell for those.",
  schema: SearchArgs,
}
