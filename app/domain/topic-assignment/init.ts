import { getFiles, getFileRaw } from "~/lib/files/store"
import { updateFileRaw } from "~/lib/files"
import { subscribeContentChanges } from "~/lib/files/subscribe-content"
import { toProseFns } from "~/domain/data-blocks/prose-registry"
import { startTopicSync } from "~/lib/topic-assignment/sync"
import { formatClassificationLog } from "~/lib/topic-assignment/log"

const logClassifications = (): void => {
  const log = formatClassificationLog(getFiles())
  if (log) console.debug(log)
}

type OnSyncProgress = (processed: number, total: number) => void

export const startTopicAssignment = (onProgress?: OnSyncProgress): Promise<void> =>
  startTopicSync({
    getFiles,
    getFile: (f) => {
      const raw = getFileRaw(f)
      return raw || undefined
    },
    updateFile: updateFileRaw,
    subscribe: subscribeContentChanges,
    toProseFns,
    onProgress,
    onBatchComplete: logClassifications,
  }).ready
