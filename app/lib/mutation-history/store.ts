import type { HistoryEntry } from "./types"

let entries: HistoryEntry[] = []
let listeners: (() => void)[] = []

const notify = (): void => listeners.forEach((l) => l())

export const pushEntries = (newEntries: HistoryEntry[]): void => {
  if (newEntries.length === 0) return
  entries = [...entries, ...newEntries]
  notify()
}

export const getEntries = (): HistoryEntry[] => entries

export const clearEntries = (): void => {
  entries = []
  notify()
}

export const subscribeEntries = (listener: () => void): (() => void) => {
  listeners = [...listeners, listener]
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}
