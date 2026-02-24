import type { HistoryEntry, ContentDiffer } from "./types"
import { diffAnnotations } from "./differs/annotations"
import { diffCodes } from "./differs/codes"
import { diffTags } from "./differs/tags"
import { diffProse } from "./differs/prose"

const contentDiffers: ContentDiffer[] = [diffAnnotations, diffCodes, diffTags, diffProse]

export const diffFileContent: ContentDiffer = (oldRaw, newRaw, path, ts) =>
  contentDiffers.flatMap((d) => d(oldRaw, newRaw, path, ts))

export const fileCreatedEntry = (path: string, ts: number): HistoryEntry => ({
  verb: "created",
  entityKind: "file",
  entityId: null,
  path,
  timestamp: ts,
  label: path,
})

export const fileDeletedEntry = (path: string, ts: number): HistoryEntry => ({
  verb: "deleted",
  entityKind: "file",
  entityId: null,
  path,
  timestamp: ts,
  label: path,
})

export const fileRenamedEntry = (path: string, newPath: string, ts: number): HistoryEntry => ({
  verb: "renamed",
  entityKind: "file",
  entityId: null,
  path,
  timestamp: ts,
  label: path,
  newPath,
})
