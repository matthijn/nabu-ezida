import type { ValidationError } from "~/lib/data-blocks/validate"
import type { ValidationContext } from "~/lib/data-blocks/validate"

const tagIdExists = (id: string, available: { id: string; label: string }[]): boolean =>
  available.some((t) => t.id === id)

const formatAvailableTags = (tags: { id: string; label: string }[]): Record<string, string> =>
  Object.fromEntries(tags.map((t) => [t.label, t.id]))

export const validateTags = (
  tags: string[] | undefined,
  context: ValidationContext
): ValidationError[] => {
  if (!tags || context.availableTags.length === 0) return []

  return tags
    .filter((tag) => !tagIdExists(tag, context.availableTags))
    .map((tag) => ({
      block: "json-attributes",
      field: "tags",
      message: `Tag "${tag}" is not defined in settings`,
      hint: formatAvailableTags(context.availableTags),
    }))
}
