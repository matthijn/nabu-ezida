export type HistoryVerb = "added" | "removed" | "updated" | "created" | "deleted" | "renamed"

export type HistoryEntry = {
  verb: HistoryVerb
  entityKind: string
  entityId: string | null
  path: string
  timestamp: number
  label: string
  color?: string
  newPath?: string
}

export type ContentDiffer = (oldRaw: string, newRaw: string, path: string, ts: number) => HistoryEntry[]
