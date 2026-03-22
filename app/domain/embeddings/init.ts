import { subscribe, getFiles, getFile, updateFileRaw, deleteFile } from "~/lib/files/store"
import { getLlmHost } from "~/lib/agent/env"
import { startEmbeddingSync } from "~/lib/embeddings/sync"
import { calloutToProse } from "~/domain/data-blocks/callout/toProse"
import { attributesToProse } from "~/domain/data-blocks/attributes/toProse"

const toProseFns: Record<string, (block: unknown) => string | null> = {
  "json-callout": calloutToProse,
  "json-attributes": attributesToProse,
}

export const startEmbeddings = (): (() => void) =>
  startEmbeddingSync({
    getFiles,
    getFile,
    updateFile: updateFileRaw,
    deleteFile,
    subscribe,
    baseUrl: getLlmHost(),
    toProseFns,
  })
