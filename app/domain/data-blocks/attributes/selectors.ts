import { DocumentMeta } from "./schema"
import { getBlock } from "~/lib/data-blocks/query"

export const getAttributes = (raw: string): DocumentMeta | null =>
  getBlock(raw, "json-attributes", DocumentMeta)
