import { z } from "zod"

const RemoveBlockArgs = z.object({
  path: z.string().min(1).describe("File path containing the block to remove"),
  language: z.string().min(1).describe("Fenced code block language (e.g. json-callout, json-attributes)"),
  id: z.string().optional().describe("ID of the block to remove (required when multiple blocks of same language exist)"),
})

export const removeBlock = {
  name: "remove_block" as const,
  description: `Remove an entire fenced code block from a document.

Identifies the block by its language tag and optionally by the id field in its JSON content. Produces a file diff that removes the block.

When multiple blocks share the same language, provide the id to disambiguate.`,
  schema: RemoveBlockArgs,
}
