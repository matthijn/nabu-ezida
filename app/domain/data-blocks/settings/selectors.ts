import { Settings } from "./schema"
import { getBlock } from "~/lib/data-blocks/query"

export const getSettings = (raw: string): Settings | null =>
  getBlock(raw, "json-settings", Settings)
