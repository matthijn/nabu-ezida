import type { FileStore } from "~/lib/files/store"
import { debounce } from "~/lib/utils/debounce"
import { isEmbeddableFile } from "~/lib/embeddings/filter"
import { stripAttributesBlock } from "~/lib/markdown/strip-attributes"
import { toEmbeddableText } from "~/lib/embeddings/text"
import { buildExcerpt } from "~/lib/text/excerpt"
import { getAttributes } from "~/domain/data-blocks/attributes/selectors"
import { shouldReclassify, contentHash } from "~/domain/data-blocks/attributes/topics/selectors"
import { replaceSingletonBlock } from "~/lib/data-blocks/parse"
import { classifyDocument, type Classification, type ExistingClassifications } from "./assign"
import { collectTypeCounts, collectSourceCounts, collectSubjectCounts } from "./log"

type ToProseFn = (block: unknown) => string | null

const TOPIC_DEBOUNCE = 30_000

const TOKENS_PER_SECTION = 250

interface TopicSyncDeps {
  getFiles: () => FileStore
  getFile: (f: string) => string | undefined
  updateFile: (f: string, content: string) => void
  subscribe: (listener: () => void) => () => void
  toProseFns: Record<string, ToProseFn>
  onProgress?: (processed: number, total: number) => void
  onBatchComplete?: () => void
}

interface TopicSyncHandle {
  ready: Promise<void>
}

const findChangedFiles = (prev: FileStore, curr: FileStore): string[] => {
  const changed: string[] = []
  for (const key of Object.keys(curr)) {
    if (!isEmbeddableFile(key)) continue
    if (prev[key] !== curr[key]) changed.push(key)
  }
  return changed
}

const toExcerpt = (raw: string, toProseFns: Record<string, ToProseFn>): string => {
  const stripped = stripAttributesBlock(raw)
  const prose = toEmbeddableText(stripped, toProseFns)
  return buildExcerpt(prose, TOKENS_PER_SECTION)
}

const writeClassificationToAttributes = (
  content: string,
  classification: Classification,
  updateFile: (f: string, content: string) => void,
  filename: string
): void => {
  const existing = getAttributes(content)
  const updated = {
    ...existing,
    type: classification.type,
    source: classification.source,
    subject: classification.subject,
    hash: contentHash(content),
  }
  const newContent = replaceSingletonBlock(content, "json-attributes", JSON.stringify(updated))
  updateFile(filename, newContent)
}

const collectExisting = (files: FileStore): ExistingClassifications => ({
  types: [...collectTypeCounts(files).keys()],
  sources: [...collectSourceCounts(files).keys()],
  subjects: [...collectSubjectCounts(files).keys()],
})

const addToSet = (set: string[], value: string): string[] =>
  set.includes(value) ? set : [...set, value]

const processFile = async (
  filename: string,
  content: string,
  existing: ExistingClassifications,
  deps: TopicSyncDeps
): Promise<Classification | null> => {
  const excerpt = toExcerpt(content, deps.toProseFns)
  if (excerpt.length === 0) return null

  const classification = await classifyDocument(excerpt, existing)
  if (!classification) {
    console.warn(`[classify] no classification for ${filename}`)
    return null
  }

  writeClassificationToAttributes(content, classification, deps.updateFile, filename)
  console.debug(
    `[classify] ${filename} → ${classification.type} / ${classification.source} / ${classification.subject}`
  )
  return classification
}

const processSync = async (changedFiles: string[], deps: TopicSyncDeps): Promise<void> => {
  const files = deps.getFiles()
  const filesToProcess = changedFiles.filter((f) => shouldReclassify(files[f]))

  if (filesToProcess.length === 0) return

  let existing = collectExisting(files)
  deps.onProgress?.(0, filesToProcess.length)

  for (let i = 0; i < filesToProcess.length; i++) {
    const filename = filesToProcess[i]
    const content = files[filename]
    if (!content) continue

    try {
      const result = await processFile(filename, content, existing, deps)
      if (result) {
        existing = {
          types: addToSet(existing.types, result.type),
          sources: addToSet(existing.sources, result.source),
          subjects: addToSet(existing.subjects, result.subject),
        }
      }
    } catch (e) {
      console.error(`[classify] failed for ${filename}:`, e)
    }

    deps.onProgress?.(i + 1, filesToProcess.length)
  }
}

export const startTopicSync = (deps: TopicSyncDeps): TopicSyncHandle => {
  let previousFiles: FileStore = {}
  let syncing = false

  const run = async (): Promise<void> => {
    if (syncing) return
    syncing = true

    try {
      const currentFiles = deps.getFiles()
      const changed = findChangedFiles(previousFiles, currentFiles)
      previousFiles = currentFiles

      if (changed.length === 0) return

      await processSync(changed, deps)
      console.debug(`[classify] batch complete: ${changed.length} files`)
      deps.onBatchComplete?.()
    } catch (e) {
      console.error("[classify] sync error:", e)
    } finally {
      syncing = false
    }
  }

  const ready = run()

  const debouncedRun = debounce(run, TOPIC_DEBOUNCE)
  deps.subscribe(debouncedRun)

  return { ready }
}
