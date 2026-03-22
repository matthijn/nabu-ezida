import { z } from "zod"

export const SearchHitSchema = z.object({
  file: z.string(),
  id: z.string().optional(),
  text: z.string().optional(),
})

export type SearchHit = z.infer<typeof SearchHitSchema>

export const SearchEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  saved: z.boolean(),
  createdAt: z.number(),
  sql: z.string(),
})

export type SearchEntry = z.infer<typeof SearchEntrySchema>
