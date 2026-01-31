import { z } from "zod"
import { tool, registerTool, ok, partial, err } from "../tool"
import {
  upsertAnnotations as upsertAnnotationsPure,
  removeAnnotations as removeAnnotationsPure,
} from "~/domain/attributes/annotations"
import { generateJsonBlockPatch } from "~/lib/diff/json-block/patch"
import { findSingletonBlock, parseBlockJson } from "~/domain/blocks/parse"
import type { DocumentMeta } from "~/domain/attributes/schema"

const AnnotationInput = z.object({
  text: z.string().describe("Text from the document to annotate"),
  reason: z.string().describe("Reason for this annotation"),
  color: z.string().optional().describe("Color for the annotation (if no code)"),
  code: z.string().optional().describe("Code ID to apply (if no color)"),
})

const UpsertArgs = z.object({
  path: z.string().describe("Path to the document"),
  annotations: z.array(AnnotationInput).describe("Annotations to add or update"),
})

const RemoveArgs = z.object({
  path: z.string().describe("Path to the document"),
  texts: z.array(z.string()).describe("Text values of annotations to remove"),
})

const ATTRIBUTES_LANG = "json-attributes"

const extractMeta = (docContent: string): DocumentMeta => {
  const block = findSingletonBlock(docContent, ATTRIBUTES_LANG)
  if (!block) return {}
  return parseBlockJson<DocumentMeta>(block) ?? {}
}

export const upsertAnnotations = registerTool(
  tool({
    name: "upsert_annotations",
    description: `Add or update annotations on a document. Each annotation must reference exact text that exists in the document.
If an annotation with the same text already exists, it will be updated.`,
    schema: UpsertArgs,
    handler: async (files, { path, annotations }) => {
      const content = files.get(path)
      if (content === undefined) {
        return err(`${path}: No such file`)
      }

      const result = upsertAnnotationsPure(content, annotations)

      if (!result.ok) {
        const errorMsg = result.errors.map((e) => `${e.block}.${e.field}: ${e.message}`).join("\n")
        return err(errorMsg)
      }

      const appliedCount = result.applied.length
      const notFoundCount = result.notFound.length

      const newMeta = extractMeta(result.content)
      const patchResult = generateJsonBlockPatch(content, ATTRIBUTES_LANG, newMeta)

      if (!patchResult.ok) {
        return err(patchResult.error)
      }

      const mutation = {
        type: "update_file" as const,
        path,
        diff: patchResult.patch,
        skipImmutableCheck: true,
      }

      if (notFoundCount > 0 && appliedCount > 0) {
        const notFoundTexts = result.notFound.map((a) => `"${a.text}"`).join(", ")
        return partial(
          `Applied ${appliedCount} annotation(s)`,
          `${notFoundCount} annotation(s) not found in document: ${notFoundTexts}`,
          [mutation]
        )
      }

      if (appliedCount === 0) {
        const notFoundTexts = result.notFound.map((a) => `"${a.text}"`).join(", ")
        return err(`No annotations applied. Text not found in document: ${notFoundTexts}`)
      }

      return ok(`Applied ${appliedCount} annotation(s)`, [mutation])
    },
  })
)

export const removeAnnotations = registerTool(
  tool({
    name: "remove_annotations",
    description: `Remove annotations from a document by their text values.`,
    schema: RemoveArgs,
    handler: async (files, { path, texts }) => {
      const content = files.get(path)
      if (content === undefined) {
        return err(`${path}: No such file`)
      }

      const result = removeAnnotationsPure(content, texts)

      if (!result.ok) {
        const errorMsg = result.errors.map((e) => `${e.block}.${e.field}: ${e.message}`).join("\n")
        return err(errorMsg)
      }

      const removedCount = result.removed.length
      const notFoundCount = result.notFound.length

      const newMeta = extractMeta(result.content)
      const patchResult = generateJsonBlockPatch(content, ATTRIBUTES_LANG, newMeta)

      if (!patchResult.ok) {
        return err(patchResult.error)
      }

      const mutation = {
        type: "update_file" as const,
        path,
        diff: patchResult.patch,
        skipImmutableCheck: true,
      }

      if (notFoundCount > 0 && removedCount > 0) {
        const notFoundTexts = result.notFound.map((t) => `"${t}"`).join(", ")
        return partial(
          `Removed ${removedCount} annotation(s)`,
          `${notFoundCount} annotation(s) not found: ${notFoundTexts}`,
          [mutation]
        )
      }

      if (removedCount === 0) {
        const notFoundTexts = result.notFound.map((t) => `"${t}"`).join(", ")
        return err(`No annotations removed. Not found: ${notFoundTexts}`)
      }

      return ok(`Removed ${removedCount} annotation(s)`, [mutation])
    },
  })
)

export const upsertHandler = upsertAnnotations.handle
export const removeHandler = removeAnnotations.handle
