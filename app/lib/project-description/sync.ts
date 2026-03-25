import type { Database } from "~/lib/db/types"
import { debounce } from "~/lib/utils/debounce"
import { sampleByLanguage } from "./sample"
import { generateDescription } from "./generate"

const DESCRIPTION_SYNC_DEBOUNCE = 60_000

export interface DescriptionSyncDeps {
  getDatabase: () => Database | null
  readDescription: () => string | undefined
  writeDescription: (description: string) => void
  subscribe: (listener: () => void) => () => void
}

const hasContent = (samples: { passages: string[] }[]): boolean =>
  samples.some((s) => s.passages.length > 0)

const processSync = async (deps: DescriptionSyncDeps): Promise<void> => {
  const db = deps.getDatabase()
  if (!db) return

  const result = await sampleByLanguage(db)
  if (!result.ok) {
    console.error("[project-description] sample failed:", result.error)
    return
  }

  if (!hasContent(result.value)) return

  try {
    const description = await generateDescription(result.value)
    const current = deps.readDescription()
    if (current === description) return

    deps.writeDescription(description)
    console.debug("[project-description] updated")
  } catch (e) {
    console.error("[project-description] generate failed:", e)
  }
}

export const startDescriptionSync = (deps: DescriptionSyncDeps): (() => void) => {
  let syncing = false

  const run = async (): Promise<void> => {
    if (syncing) return
    syncing = true
    try {
      await processSync(deps)
    } finally {
      syncing = false
    }
  }

  const debouncedRun = debounce(run, DESCRIPTION_SYNC_DEBOUNCE)

  return deps.subscribe(debouncedRun)
}
