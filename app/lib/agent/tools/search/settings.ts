import { getFileRaw, updateFileRaw } from "~/lib/files/store"
import { findSingletonBlock, parseBlockJson, replaceSingletonBlock } from "~/lib/data-blocks/parse"
import type { Settings } from "~/domain/data-blocks/settings/schema"
import { SETTINGS_FILE } from "~/lib/files/filename"
import type { SearchEntry } from "~/domain/search"

export const readSettings = (): Settings => {
  const raw = getFileRaw(SETTINGS_FILE)
  const block = findSingletonBlock(raw, "json-settings")
  if (!block) return {}
  const parsed = parseBlockJson<Settings>(block)
  return parsed.ok ? parsed.data : {}
}

export const updateSearchEntries = (entries: SearchEntry[]): void => {
  const raw = getFileRaw(SETTINGS_FILE)
  const settings = readSettings()
  const updated = { ...settings, searches: entries }
  const newRaw = replaceSingletonBlock(raw, "json-settings", JSON.stringify(updated, null, 2))
  updateFileRaw(SETTINGS_FILE, newRaw)
}
