import { z } from "zod"
import { BLOCK_COLORS } from "~/lib/colors/radix"

const radixColor = z.enum(BLOCK_COLORS as [string, ...string[]])

const calloutType = z.enum(["codebook", "code", "idea", "quote", "note"])

export const CalloutSchema = z.object({
  id: z.string(),
  type: calloutType,
  title: z.string(),
  content: z.string(),
  color: radixColor,
  collapsed: z.boolean(),
})

export type CalloutBlock = z.infer<typeof CalloutSchema>
export type CalloutType = z.infer<typeof calloutType>
