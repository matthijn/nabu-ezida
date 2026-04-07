import { z } from "zod"
import { slug, radixColor } from "~/domain/data-blocks/attributes/schema"
import { ICON_NAMES } from "~/ui/theme/icons"
import { SearchEntrySchema } from "~/domain/search"

export const TagDefinition = z.object({
  id: z.string(),
  label: slug,
  display: z.string(),
  color: radixColor,
  icon: z.enum(ICON_NAMES),
})

export type TagDefinition = z.infer<typeof TagDefinition>

const deduplicateByLabel = (tags: TagDefinition[]): TagDefinition[] => {
  const seen = new Set<string>()
  return tags.filter((t) => (!seen.has(t.label) ? (seen.add(t.label), true) : false))
}

export const settingsSchema = () =>
  z.object({
    tags: z
      .array(TagDefinition)
      .optional()
      .transform((tags) => (tags ? deduplicateByLabel(tags) : tags)),
    searches: z.array(SearchEntrySchema).optional(),
  })

export const Settings = settingsSchema()
export type Settings = z.infer<typeof Settings>
