import { z } from "zod"

export const SearchQuerySchema = z.object({
  type: z.enum(["file", "hit"]),
  sql: z.string(),
})

export type SearchQuery = z.infer<typeof SearchQuerySchema>

export const SearchEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  saved: z.boolean(),
  createdAt: z.number(),
  queries: z.array(SearchQuerySchema),
  highlights: z.array(z.string()),
})

export type SearchEntry = z.infer<typeof SearchEntrySchema>

export type SearchHit =
  | { type: "file"; file: string }
  | { type: "hit"; file: string; id: string }
  | { type: "text"; file: string; line: number; term: string }
