import { z } from "zod"
import { tool, registerTool, ok, err } from "./tool"
import { findSingletonBlock, parseBlockJson } from "~/domain/blocks/parse"
import { applyJsonPatchOps } from "~/lib/diff/json-block/apply"
import { generateJsonBlockPatch } from "~/lib/diff/json-block/patch"

const JsonPatchOpSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("add"),
    path: z.string().describe("JSON Pointer (RFC 6901) to the target location"),
    value: z.unknown().describe("Value to add"),
  }),
  z.object({
    op: z.literal("remove"),
    path: z.string().describe("JSON Pointer to the value to remove"),
  }),
  z.object({
    op: z.literal("replace"),
    path: z.string().describe("JSON Pointer to the value to replace"),
    value: z.unknown().describe("New value"),
  }),
  z.object({
    op: z.literal("move"),
    from: z.string().describe("JSON Pointer to the source location"),
    path: z.string().describe("JSON Pointer to the target location"),
  }),
  z.object({
    op: z.literal("copy"),
    from: z.string().describe("JSON Pointer to the source location"),
    path: z.string().describe("JSON Pointer to the target location"),
  }),
  z.object({
    op: z.literal("test"),
    path: z.string().describe("JSON Pointer to the value to test"),
    value: z.unknown().describe("Expected value"),
  }),
])

const PatchJsonBlockArgs = z.object({
  path: z.string().min(1).describe("File path containing the JSON block"),
  language: z.string().min(1).describe("Fenced code block language (e.g. json-attributes, json-callout)"),
  operations: z.array(JsonPatchOpSchema).min(1).describe("RFC 6902 JSON Patch operations to apply"),
})

export const patchJsonBlock = registerTool(
  tool({
    name: "patch_json_block",
    description: `Apply RFC 6902 JSON Patch operations to a fenced JSON code block within a document.

Finds the block by language identifier, applies the operations to its parsed JSON, and produces a file diff.

Supported operations: add, remove, replace, move, copy, test.
Paths use JSON Pointer syntax (RFC 6901): /field, /array/0, /nested/deep/field, /array/- (append).`,
    schema: PatchJsonBlockArgs,
    handler: async (files, { path, language, operations }) => {
      const content = files.get(path)
      if (!content) return err(`${path}: No such file`)

      const block = findSingletonBlock(content, language)
      if (!block) return err(`${path}: No \`${language}\` block found`)

      const json = parseBlockJson(block)
      if (json === null) return err(`${path}: Failed to parse JSON in \`${language}\` block`)

      const applied = applyJsonPatchOps(json, operations)
      if (!applied.ok) return err(`Patch failed: ${applied.error}`)

      const diffResult = generateJsonBlockPatch(content, language, applied.result as object)
      if (!diffResult.ok) return err(`Diff generation failed: ${diffResult.error}`)

      if (!diffResult.patch) return ok(`${path}: No changes`)

      return ok(`Patched \`${language}\` block in ${path}`, [{ type: "update_file", path, diff: diffResult.patch }])
    },
  })
)
