import { DocumentMeta } from "./schema"
import { getBlock } from "~/lib/blocks/query"

export const getAttributes = (raw: string): DocumentMeta | null =>
  getBlock(raw, "json-attributes", DocumentMeta)
