import { z } from "zod"
import type { AnyTool } from "../../executors/tool"

export const SearchArgs = z.object({
  title: z
    .string()
    .describe("Short 2-4 word label, e.g. 'Interview documents', 'Frustration mentions'"),
  description: z.string().describe("Human-readable summary of what was searched for"),
  sql: z
    .string()
    .describe(
      "SQL query. Must SELECT file. Optionally id and/or text. Supports SEMANTIC('description of passages to find')."
    ),
  highlight: z
    .string()
    .describe(
      "What to highlight in each result chunk. Describes the relevant passages to extract and show to the user."
    ),
})

export const searchTool: AnyTool = {
  name: "search",
  description:
    "Search the project database and persist results as a browsable page the user can revisit. Not for counting or aggregation — use query for those.",
  schema: SearchArgs,
}
