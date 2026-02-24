import { getTags } from "~/lib/files/selectors"
import type { HistoryEntry, ContentDiffer } from "../types"

const toTagEntry = (verb: "added" | "removed", tag: string, path: string, ts: number): HistoryEntry => ({
  verb,
  entityKind: "tag",
  entityId: null,
  path,
  timestamp: ts,
  label: tag,
})

export const diffTags: ContentDiffer = (oldRaw, newRaw, path, ts) => {
  const oldSet = new Set(getTags(oldRaw))
  const newSet = new Set(getTags(newRaw))

  const removed = [...oldSet].filter((t) => !newSet.has(t)).map((t) => toTagEntry("removed", t, path, ts))
  const added = [...newSet].filter((t) => !oldSet.has(t)).map((t) => toTagEntry("added", t, path, ts))

  return [...removed, ...added]
}
