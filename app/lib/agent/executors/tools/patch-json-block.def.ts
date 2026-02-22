import { z } from "zod"

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

export const patchJsonBlock = {
  name: "patch_json_block" as const,
  description: "Apply RFC 6902 JSON Patch operations to a fenced JSON code block within a document. Array items must be targeted by selector ([key=value], [key!=value], [key], [!key]), not numeric index.",
  schema: PatchJsonBlockArgs,
}
