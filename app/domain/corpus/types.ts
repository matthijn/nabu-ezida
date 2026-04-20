import { z } from "zod"

export const GENERAL_CORPUS = "general:general"

export const toCorpusKey = (type: string, subject: string): string => `${type}:${subject}`

export const CorpusDescriptionSchema = z.object({
  language: z.string(),
  corpus: z.string(),
  description: z.string(),
  hash: z.string(),
})

export type CorpusDescription = z.infer<typeof CorpusDescriptionSchema>
