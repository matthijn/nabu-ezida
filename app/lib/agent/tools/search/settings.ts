import { getFileRaw, updateFileRaw, finalizeContent } from "~/lib/files"
import { replaceSingletonBlock } from "~/lib/data-blocks/parse"
import type { Settings } from "~/domain/data-blocks/settings/schema"
import { getSettings } from "~/domain/data-blocks/settings/selectors"
import { SETTINGS_FILE } from "~/lib/files/filename"
import type { SearchEntry } from "~/domain/search"

export const readSettings = (): Settings => getSettings(getFileRaw(SETTINGS_FILE)) ?? {}

export const updateSearchEntries = (entries: SearchEntry[]): string | null => {
  const raw = getFileRaw(SETTINGS_FILE)
  const current = getSettings(raw) ?? {}
  const updated = { ...current, searches: entries }
  const newRaw = replaceSingletonBlock(raw, "json-settings", JSON.stringify(updated, null, 2))
  const result = finalizeContent(SETTINGS_FILE, newRaw, { original: raw })
  if (result.status === "error") return result.error
  updateFileRaw(result.path, result.content)
  return null
}
