import type { HistoryEntry, HistoryVerb } from "./types"

const omitKeys = <T extends Record<string, unknown>>(obj: T, keys: Set<string>): Partial<T> =>
  Object.fromEntries(Object.entries(obj).filter(([k]) => !keys.has(k))) as Partial<T>

export const hasChangedExcluding = <T extends Record<string, unknown>>(ignoreKeys: string[]) => {
  const keys = new Set(ignoreKeys)
  return (a: T, b: T): boolean =>
    JSON.stringify(omitKeys(a, keys)) !== JSON.stringify(omitKeys(b, keys))
}

export const diffById = <T>(
  oldItems: T[],
  newItems: T[],
  getId: (item: T) => string,
  toEntry: (verb: HistoryVerb, item: T) => HistoryEntry,
  hasChanged: (a: T, b: T) => boolean,
): HistoryEntry[] => {
  const oldMap = new Map(oldItems.map((item) => [getId(item), item]))
  const newMap = new Map(newItems.map((item) => [getId(item), item]))

  const removed = oldItems
    .filter((item) => !newMap.has(getId(item)))
    .map((item) => toEntry("removed", item))

  const added = newItems
    .filter((item) => !oldMap.has(getId(item)))
    .map((item) => toEntry("added", item))

  const updated = newItems
    .filter((item) => {
      const old = oldMap.get(getId(item))
      return old !== undefined && hasChanged(old, item)
    })
    .map((item) => toEntry("updated", item))

  return [...removed, ...added, ...updated]
}
