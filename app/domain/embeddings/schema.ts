import { z } from "zod"

export const EmbeddingRowSchema = z.object({
  text: z.string(),
  hash: z.string(),
  embedding: z.array(z.number()),
})

export type EmbeddingRow = z.infer<typeof EmbeddingRowSchema>
