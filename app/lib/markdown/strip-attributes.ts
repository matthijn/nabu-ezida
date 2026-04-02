import { stripBlocksByLanguage } from "~/lib/data-blocks/parse"

export const stripAttributesBlock = (raw: string): string =>
  stripBlocksByLanguage(raw, "json-attributes")
