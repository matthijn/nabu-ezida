import { CalloutSchema, type CalloutBlock } from "./schema"
import { getBlocks } from "~/lib/blocks/query"

export const getCallouts = (raw: string): CalloutBlock[] =>
  getBlocks(raw, "json-callout", CalloutSchema)

export const findCalloutById = (
  files: Record<string, string>,
  id: string
): CalloutBlock | undefined =>
  Object.values(files)
    .flatMap(getCallouts)
    .find((c) => c.id === id)

export const findDocumentForCallout = (
  files: Record<string, string>,
  id: string
): string | undefined =>
  Object.entries(files).find(([_, raw]) => getCallouts(raw).some((c) => c.id === id))?.[0]
