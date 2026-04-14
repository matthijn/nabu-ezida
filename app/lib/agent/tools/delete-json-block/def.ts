import { z } from "zod"

const DeleteJsonBlockArgs = z.object({
  path: z.string().min(1).describe("File path containing the JSON block"),
  language: z
    .string()
    .min(1)
    .describe("Fenced code block language (e.g. json-callout, json-chart)"),
  block_id: z
    .string()
    .optional()
    .describe(
      "ID of the specific block to target. Required when multiple blocks of the same language exist."
    ),
})

export const deleteJsonBlock = {
  name: "delete_json_block" as const,
  description:
    "Delete an entire fenced JSON code block from a document. For singleton block types, no block_id is needed. For multi-block types (e.g. json-callout), block_id is required.\n\nparallel: self=diff blocks yes / others=with reads yes",
  schema: DeleteJsonBlockArgs,
}
