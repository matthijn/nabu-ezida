import { z } from "zod"
import { slug, radixColor } from "~/domain/data-blocks/attributes/schema"
import { ICON_NAMES } from "~/ui/theme/icons"

export const TagDefinition = z.object({
  id: z.string(),
  label: slug,
  display: z.string(),
  color: radixColor,
  icon: z.enum(ICON_NAMES),
})

export type TagDefinition = z.infer<typeof TagDefinition>

export const Settings = z.object({
  tags: z.array(TagDefinition).optional(),
})

export type Settings = z.infer<typeof Settings>
