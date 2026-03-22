import type { Settings } from "../schema"
import type { ValidationError } from "~/lib/data-blocks/validate"
import type { SearchEntry } from "~/domain/search"
import { validateSql } from "~/lib/search/semantic"

const validateEntry = (entry: SearchEntry): ValidationError[] => {
  const result = validateSql(entry.sql)
  if (result.ok) return []
  return [{ block: "json-settings", field: "searches", message: result.error }]
}

export const validateSearchSql = (parsed: Settings): ValidationError[] => {
  if (!parsed.searches) return []
  return parsed.searches.flatMap(validateEntry)
}
