import { subscribe, getState } from "~/lib/services/projectSync"
import { createScopedDebounce } from "~/lib/utils"
import { addTask, removeTask } from "~/lib/tasks"
import { convertDocument } from "./api"
import type { Document } from "~/domain/document"

const CONVERT_DEBOUNCE_MS = 1000

const debouncer = createScopedDebounce(CONVERT_DEBOUNCE_MS)

const hasTag = (doc: Document, tag: string): boolean =>
  tag in (doc.tags ?? {})

const getDocument = (docId: string): Document | undefined =>
  getState().project?.documents[docId]

const runConversion = async (docId: string, kind: string, signal: AbortSignal): Promise<void> => {
  const doc = getDocument(docId)
  if (!doc) return

  const taskKey = `${kind}:${docId}`
  addTask(taskKey, doc.name)

  try {
    await convertDocument(doc, kind, signal)
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") return
    console.error(`[Convert] Failed for ${docId}:`, e)
  } finally {
    removeTask(taskKey)
  }
}

const scheduleConversion = (docId: string, kind: string): void => {
  const key = `${kind}:${docId}`
  debouncer.call(key, (signal) => runConversion(docId, kind, signal))
}

const checkDocument = (doc: Document): void => {
  if (hasTag(doc, "codebook")) {
    scheduleConversion(doc.id, "codebook")
  }
}

export const startConvertListener = (): (() => void) => {
  let previousDocs: Record<string, Document> = {}

  const unsubscribe = subscribe((state) => {
    if (!state.project) {
      previousDocs = {}
      return
    }

    const currentDocs = state.project.documents

    for (const [id, doc] of Object.entries(currentDocs)) {
      const prev = previousDocs[id]
      if (!prev || prev !== doc) {
        checkDocument(doc)
      }
    }

    previousDocs = currentDocs
  })

  const state = getState()
  if (state.project) {
    for (const doc of Object.values(state.project.documents)) {
      checkDocument(doc)
    }
  }

  return () => {
    unsubscribe()
    debouncer.cancelAll()
  }
}
