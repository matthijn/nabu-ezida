import type { CalloutBlock } from "./schema"

export const calloutToProse = (block: unknown): string | null => {
  const callout = block as Partial<CalloutBlock>
  if (!callout.title || !callout.content) return null
  return `${callout.title}\n${callout.content}`
}
