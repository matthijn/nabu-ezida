import type { Annotation } from "~/domain/data-blocks/attributes/schema"
import { getStoredAnnotations } from "~/domain/data-blocks/attributes/annotations/selectors"
import type { HistoryEntry, HistoryVerb, ContentDiffer } from "../types"
import { diffById, hasChangedExcluding } from "../diff-by-id"

const getId = (a: Annotation): string => a.id ?? ""

const hasChanged = hasChangedExcluding<Annotation>(["id", "actor"])

const toEntry =
  (path: string, ts: number) =>
  (verb: HistoryVerb, a: Annotation): HistoryEntry => ({
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
    hasChanged
  )
