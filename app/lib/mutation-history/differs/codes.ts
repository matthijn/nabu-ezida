import type { CalloutBlock } from "~/domain/data-blocks/callout/schema"
import { getCodes } from "~/domain/data-blocks/callout/codes/selectors"
import type { HistoryEntry, HistoryVerb, ContentDiffer } from "../types"
import { diffById, hasChangedExcluding } from "../diff-by-id"

const getId = (c: CalloutBlock): string => c.id

const hasChanged = hasChangedExcluding<CalloutBlock>(["id", "type", "actor"])

const toEntry =
  (path: string, ts: number) =>
  (verb: HistoryVerb, c: CalloutBlock): HistoryEntry => ({
    verb,
    entityKind: "code",
    entityId: c.id,
    path,
    timestamp: ts,
    label: c.title,
    color: c.color,
  })

export const diffCodes: ContentDiffer = (oldRaw, newRaw, path, ts) =>
  diffById(getCodes(oldRaw), getCodes(newRaw), getId, toEntry(path, ts), hasChanged)
