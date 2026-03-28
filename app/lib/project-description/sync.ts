import type { Database } from "~/lib/db/types"
import type { Result } from "~/lib/fp/result"
import type { EmbeddingError } from "~/lib/embeddings/client"
import { debounce } from "~/lib/utils/debounce"
import { cosineSimilarity } from "~/lib/embeddings/similarity"
import { samplePassages } from "./sample"
import { generateDescription } from "./generate"

const DESCRIPTION_SYNC_DEBOUNCE = 60_000
const SIMILARITY_THRESHOLD = 0.92

export interface DescriptionSyncDeps {
  getDatabase: () => Database | null
  readDescription: () => string | undefined
  writeDescription: (description: string) => void
  subscribe: (listener: () => void) => () => void
  embedTexts: (texts: string[]) => Promise<Result<number[][], EmbeddingError>>
}

const isSemanticallyDifferent = async (
  current: string,
  candidate: string,
  embedTexts: DescriptionSyncDeps["embedTexts"]
): Promise<boolean> => {
  const result = await embedTexts([current, candidate])
  if (!result.ok) {
    console.error("[project-description] embedding failed:", result.error)
    return true
  }
  const similarity = cosineSimilarity(result.value[0], result.value[1])
  console.debug(`[project-description] similarity: ${similarity.toFixed(4)}`)
  return similarity < SIMILARITY_THRESHOLD
}

const processSync = async (deps: DescriptionSyncDeps): Promise<void> => {
  const db = deps.getDatabase()
  if (!db) return

  const result = await samplePassages(db)
  if (!result.ok) {
    console.error("[project-description] sample failed:", result.error)
    return
  }

  if (result.value.length === 0) return

  try {
    const description = await generateDescription(result.value)
    const current = deps.readDescription()

    if (!current) {
      deps.writeDescription(description)
      console.debug("[project-description] initial write")
      return
    }

    if (current === description) return

    const different = await isSemanticallyDifferent(current, description, deps.embedTexts)
    if (!different) {
      console.debug("[project-description] semantically unchanged, skipping write")
      return
    }

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
