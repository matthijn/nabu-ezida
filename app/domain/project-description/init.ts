import { subscribe } from "~/lib/files/store"
import { getFileRaw, updateFileRaw, finalizeContent } from "~/lib/files"
import { replaceSingletonBlock } from "~/lib/data-blocks/parse"
import { SETTINGS_FILE } from "~/lib/files/filename"
import { getSettings } from "~/domain/data-blocks/settings/selectors"
import { getDatabase } from "~/domain/db/database"
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

export const startProjectDescription = (): (() => void) =>
  startDescriptionSync({
    getDatabase,
    readDescription,
    writeDescription,
    subscribe,
  })
