import { z } from "zod"
import { validateSql } from "~/lib/search/semantic"

export const SearchHitSchema = z.object({
  file: z.string(),
  id: z.string().optional(),
  text: z.string().optional(),
})

export type SearchHit = z.infer<typeof SearchHitSchema>

const validSql = z.string().superRefine((sql, ctx) => {
  const result = validateSql(sql)
  if (!result.ok) ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.error })
})

export const SearchEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  highlight: z.string().default(""),
  saved: z.boolean(),
  createdAt: z.number(),
  sql: validSql,
})

export type SearchEntry = z.infer<typeof SearchEntrySchema>
