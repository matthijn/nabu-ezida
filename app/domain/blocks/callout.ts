import { z } from "zod"
import { BLOCK_COLORS } from "~/lib/colors/radix"

const radixColor = z.enum(BLOCK_COLORS as [string, ...string[]])

const calloutType = z.enum(["codebook", "code", "idea", "quote", "note"])

const normalizeNewlines = (text: string): string =>
  text.replace(/\\n/g, "\n").replace(/\n{2,}/g, "\n")

const normalizedString = z.string().transform(normalizeNewlines)

export const CalloutSchema = z.object({
  id: z.string(),
  type: calloutType,
  title: z.string(),
  content: normalizedString,
  color: radixColor,
  collapsed: z.boolean(),
})

export type CalloutBlock = z.infer<typeof CalloutSchema>
export type CalloutType = z.infer<typeof calloutType>

export const parseCallout = (content: string): CalloutBlock | null => {
  try {
    const json = JSON.parse(content)
    const result = CalloutSchema.safeParse(json)
    return result.success ? result.data : null
  } catch {
    return null
  }
}
