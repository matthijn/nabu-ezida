import { z } from "zod"

export const EmbeddingChunkSchema = z.object({
  hash: z.string(),
  text: z.string(),
  embedding: z.array(z.number()),
})

export const EmbeddingsBlockSchema = z.object({
  source: z.string(),
  chunks: z.array(EmbeddingChunkSchema),
})

export type EmbeddingChunk = z.infer<typeof EmbeddingChunkSchema>
export type EmbeddingsBlock = z.infer<typeof EmbeddingsBlockSchema>
