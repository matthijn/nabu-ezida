import type { Annotation } from "../schema"
import type { ValidationError } from "~/lib/blocks/validate"
import type { ValidationContext } from "~/lib/blocks/validate"
import { removeFromRequired } from "~/lib/blocks/json-schema"

const textExistsInProse = (text: string, prose: string): boolean =>
  prose.toLowerCase().includes(text.toLowerCase())

const codeExists = (codeId: string, codes: { id: string }[]): boolean =>
  codes.some((c) => c.id === codeId)

const formatAvailableCodes = (codes: { id: string; name: string }[]): Record<string, string> =>
  Object.fromEntries(codes.map((c) => [c.name, c.id]))

export const validateAnnotations = (
  annotations: Annotation[] | undefined,
  context: ValidationContext
): ValidationError[] => {
  if (!annotations) return []

  const errors: ValidationError[] = []

  for (const annotation of annotations) {
    if (!textExistsInProse(annotation.text, context.documentProse)) {
      errors.push({
        block: "json-attributes",
        field: "annotations",
        message: `Text "${annotation.text}" not found in document. Use exact text from the document. If unsure, use FUZZY[[approximate text]] for fuzzy matching (e.g. "text": "FUZZY[[somthing like this]]").`,
      })
    }

    if (annotation.code && !codeExists(annotation.code, context.availableCodes)) {
      errors.push({
        block: "json-attributes",
        field: "annotations",
        message: `Code "${annotation.code}" not found`,
        hint: formatAvailableCodes(context.availableCodes),
      })
    }
  }

  return errors
}

export const patchAnnotationRequired = (schema: Record<string, unknown>): Record<string, unknown> =>
  removeFromRequired(schema, ["properties", "annotations", "items"], ["color", "code"])
