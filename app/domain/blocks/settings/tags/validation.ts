import type { Settings, TagDefinition } from "../schema"
import type { ValidationError } from "~/lib/blocks/validate"

const findDuplicateLabels = (tags: TagDefinition[]): string[] => {
  const seen = new Set<string>()
  return tags
    .filter((t) => (!seen.has(t.label) ? (seen.add(t.label), false) : true))
    .map((t) => t.label)
}

const formatAllTags = (tags: TagDefinition[]): Record<string, string> =>
  Object.fromEntries(tags.map((t) => [t.label, t.id]))

export const validateTagLabels = (parsed: Settings): ValidationError[] => {
  const tags = parsed.tags
  if (!tags) return []
  const dupes = findDuplicateLabels(tags)
  if (dupes.length === 0) return []
  return dupes.map((label) => ({
    block: "json-settings",
    field: "tags",
    message: `Duplicate tag label "${label}". Existing tags:`,
    hint: formatAllTags(tags),
  }))
}
