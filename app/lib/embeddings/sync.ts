import type { FileStore } from "~/lib/files/store"
import { debounce } from "~/lib/utils/debounce"
import { isEmbeddableFile } from "./filter"
import { companionFilename, buildCompanionMarkdown, parseCompanionEntries } from "./companion"
import { toEmbeddableText } from "./text"
import { chunkText } from "./chunk"
import { diffChunks, type EmbeddingEntry } from "./diff"
import { fetchEmbeddings } from "./client"
import { EMBEDDING_SYNC_DEBOUNCE } from "./constants"

type ToProseFn = (block: unknown) => string | null

export interface EmbeddingSyncDeps {
  getFiles: () => FileStore
  getFile: (f: string) => string | undefined
  updateFile: (f: string, content: string) => void
  deleteFile: (f: string) => void
  subscribe: (listener: () => void) => () => void
  baseUrl: string
  toProseFns: Record<string, ToProseFn>
}

interface FileChunks {
  filename: string
  entries: EmbeddingEntry[]
  needed: { index: number; text: string; hash: string }[]
}

const findDirtyFiles = (prev: FileStore, next: FileStore): string[] =>
  Object.keys(next).filter((f) => isEmbeddableFile(f) && next[f] !== prev[f])

const findDeletedFiles = (prev: FileStore, next: FileStore): string[] =>
  Object.keys(prev).filter((f) => isEmbeddableFile(f) && !(f in next))

const prepareFile = (
  filename: string,
  content: string,
  companionContent: string | undefined,
  toProseFns: Record<string, ToProseFn>
): FileChunks => {
  const embeddableText = toEmbeddableText(content, toProseFns)
  const chunks = chunkText(embeddableText)
  const existing = companionContent ? parseCompanionEntries(companionContent) : []
  const { keep, needed } = diffChunks(existing, chunks)
  return { filename, entries: keep, needed }
}

const distributeEmbeddings = (
  fileChunks: FileChunks[],
  allEmbeddings: number[][]
): Map<string, EmbeddingEntry[]> => {
  const result = new Map<string, EmbeddingEntry[]>()
  let embeddingIdx = 0

  for (const fc of fileChunks) {
    const entries = [...fc.entries]

    for (const chunk of fc.needed) {
      entries.push({
        hash: chunk.hash,
        text: chunk.text,
        embedding: allEmbeddings[embeddingIdx++],
      })
    }

    result.set(fc.filename, entries)
  }

  return result
}

const processSync = async (
  prev: FileStore,
  next: FileStore,
  deps: EmbeddingSyncDeps
): Promise<void> => {
  const dirty = findDirtyFiles(prev, next)
  const deleted = findDeletedFiles(prev, next)

  for (const filename of deleted) {
    const companion = companionFilename(filename)
    if (deps.getFile(companion) !== undefined) {
      deps.deleteFile(companion)
    }
  }

  if (dirty.length === 0) return

  const fileChunks = dirty.map((filename) => {
    const content = next[filename]
    const companion = deps.getFile(companionFilename(filename))
    return prepareFile(filename, content, companion, deps.toProseFns)
  })

  const allNeeded = fileChunks.flatMap((fc) => fc.needed)
  if (allNeeded.length === 0) return

  const texts = allNeeded.map((c) => c.text)
  const result = await fetchEmbeddings(texts, deps.baseUrl)

  if (!result.ok) {
    console.error("[embeddings] fetch failed:", result.error)
    return
  }

  const distributed = distributeEmbeddings(fileChunks, result.value)

  for (const [filename, entries] of distributed) {
    const companion = companionFilename(filename)
    const markdown = buildCompanionMarkdown(entries)
    deps.updateFile(companion, markdown)
  }

  console.debug(`[embeddings] synced ${dirty.length} files, ${allNeeded.length} new chunks`)
}

export const startEmbeddingSync = (deps: EmbeddingSyncDeps): (() => void) => {
  let previousFiles: FileStore = {}
  let syncing = false

  const run = async (): Promise<void> => {
    if (syncing) return
    syncing = true

    try {
      const currentFiles = deps.getFiles()
      await processSync(previousFiles, currentFiles, deps)
      previousFiles = currentFiles
    } catch (e) {
      console.error("[embeddings] sync error:", e)
    } finally {
      syncing = false
    }
  }

  run()

  const debouncedRun = debounce(run, EMBEDDING_SYNC_DEBOUNCE)

  return deps.subscribe(debouncedRun)
}
