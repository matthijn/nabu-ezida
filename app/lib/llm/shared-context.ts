import type { CompactionBlock } from "./types"

type SharedContextStore = {
  compactions: CompactionBlock[]
  listeners: Set<() => void>
}

const store: SharedContextStore = {
  compactions: [],
  listeners: new Set(),
}

export const getSharedContext = (): CompactionBlock[] => store.compactions

export const pushSharedContext = (compaction: CompactionBlock): void => {
  store.compactions = [...store.compactions, compaction]
  store.listeners.forEach((listener) => listener())
}

export const clearSharedContext = (): void => {
  store.compactions = []
  store.listeners.forEach((listener) => listener())
}

export const subscribeToSharedContext = (listener: () => void): (() => void) => {
  store.listeners.add(listener)
  return () => store.listeners.delete(listener)
}
