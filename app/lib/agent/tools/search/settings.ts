import { getFileRaw, updateFileRaw, finalizeContent } from "~/lib/files"
import { replaceSingletonBlock } from "~/lib/data-blocks/parse"
import type { Settings } from "~/domain/data-blocks/settings/schema"
import { getSettings } from "~/domain/data-blocks/settings/selectors"
import { SETTINGS_FILE } from "~/lib/files/filename"
import type { SearchEntry } from "~/domain/search"

export interface NewSearchData {
  title: string
  description: string
  highlight: string
  sql: string
}

const MAX_UNSAVED = 3

const generateShortId = (): string => {
  const digit = Math.floor(Math.random() * 10).toString()
  const rest = Math.random().toString(36).substring(2, 9)
  return digit + rest
}

const generateSearchId = (): string => `search-${generateShortId()}`

const isUnsaved = (entry: SearchEntry): boolean => !entry.saved

const rotateUnsaved = (entries: SearchEntry[]): SearchEntry[] => {
  const saved = entries.filter((e) => e.saved)
  const unsaved = entries.filter(isUnsaved)
  const sorted = [...unsaved].sort((a, b) => b.createdAt - a.createdAt)
  return [...saved, ...sorted.slice(0, MAX_UNSAVED)]
}

const readSettings = (): Settings => getSettings(getFileRaw(SETTINGS_FILE)) ?? {}

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

export const saveNewSearch = (data: NewSearchData): string | null => {
  const id = generateSearchId()
  const entry: SearchEntry = {
    id,
    title: data.title,
    description: data.description,
    highlight: data.highlight,
    saved: false,
    createdAt: Date.now(),
    sql: data.sql,
  }

  const settings = readSettings()
  const withNew = [...(settings.searches ?? []), entry]
  const rotated = rotateUnsaved(withNew)
  const writeError = updateSearchEntries(rotated)
  return writeError ? null : id
}
