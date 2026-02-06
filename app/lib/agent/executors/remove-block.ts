import { z } from "zod"
import { tool, registerTool, ok, err } from "./tool"
import { generateBlockRemovalDiff } from "~/lib/diff/json-block/remove"

const RemoveBlockArgs = z.object({
  path: z.string().min(1).describe("File path containing the block to remove"),
  language: z.string().min(1).describe("Fenced code block language (e.g. json-callout, json-attributes)"),
  id: z.string().optional().describe("ID of the block to remove (required when multiple blocks of same language exist)"),
})

export const removeBlock = registerTool(
  tool({
    name: "remove_block",
    description: `Remove an entire fenced code block from a document.

Identifies the block by its language tag and optionally by the id field in its JSON content. Produces a file diff that removes the block.

When multiple blocks share the same language, provide the id to disambiguate.`,
    schema: RemoveBlockArgs,
    handler: async (files, { path, language, id }) => {
      const content = files.get(path)
      if (!content) return err(`${path}: No such file`)

      const result = generateBlockRemovalDiff(content, language, id)
      if (!result.ok) return err(`${path}: ${result.error}`)

      return ok(`Removed \`${language}\` block from ${path}`, [{ type: "update_file", path, diff: result.patch }])
    },
  })
)
