import { subscribe, getFiles, type FileStore } from "~/lib/files/store"
import { getFileRaw, updateFileRaw, finalizeContent } from "~/lib/files"
import { replaceSingletonBlock } from "~/lib/data-blocks/parse"
import { SETTINGS_FILE, isHiddenFile } from "~/lib/files/filename"
import { getSettings } from "~/domain/data-blocks/settings/selectors"
import { getDatabase } from "~/domain/db/database"
import { getLlmHost } from "~/lib/agent/env"
import { fetchEmbeddingBatch } from "~/lib/embeddings/client"
import { startDescriptionSync } from "~/lib/project-description/sync"

const readDescription = (): string | undefined =>
  getSettings(getFileRaw(SETTINGS_FILE))?.description

const writeDescription = (description: string): void => {
  const raw = getFileRaw(SETTINGS_FILE)
  const current = getSettings(raw) ?? {}
  const updated = { ...current, description }
  const newRaw = replaceSingletonBlock(raw, "json-settings", JSON.stringify(updated, null, 2))
  const result = finalizeContent(SETTINGS_FILE, newRaw, { original: raw })
  if (result.status === "error") {
    console.error("[project-description] write failed:", result.error)
    return
  }
  updateFileRaw(result.path, result.content)
}

const hasContentChanges = (prev: FileStore, curr: FileStore): boolean => {
  const allKeys = new Set([...Object.keys(prev), ...Object.keys(curr)])
  for (const key of allKeys) {
    if (isHiddenFile(key)) continue
    if (prev[key] !== curr[key]) return true
  }
  return false
}

const subscribeContentChanges = (listener: () => void): (() => void) => {
  let previous = getFiles()
  return subscribe(() => {
    const current = getFiles()
    const changed = hasContentChanges(previous, current)
    previous = current
    if (changed) listener()
  })
}

const embedTexts = (texts: string[]) => fetchEmbeddingBatch(texts, getLlmHost())

export const startProjectDescription = (): (() => void) =>
  startDescriptionSync({
    getDatabase,
    readDescription,
    writeDescription,
    subscribe: subscribeContentChanges,
    embedTexts,
  })
