import type { StoredAnnotation } from "~/domain/attributes"
import { getStoredAnnotations } from "~/lib/files/selectors"
import type { HistoryEntry, HistoryVerb, ContentDiffer } from "../types"
import { diffById, hasChangedExcluding } from "../diff-by-id"

const getId = (a: StoredAnnotation): string => a.id ?? ""

const hasChanged = hasChangedExcluding<StoredAnnotation>(["id", "actor"])

const toEntry = (path: string, ts: number) =>
  (verb: HistoryVerb, a: StoredAnnotation): HistoryEntry => ({
    verb,
    entityKind: "annotation",
    entityId: a.id ?? null,
    path,
    timestamp: ts,
    label: a.text,
    color: a.color,
  })

export const diffAnnotations: ContentDiffer = (oldRaw, newRaw, path, ts) =>
  diffById(
    getStoredAnnotations(oldRaw).filter((a) => a.id),
    getStoredAnnotations(newRaw).filter((a) => a.id),
    getId,
    toEntry(path, ts),
    hasChanged,
  )
