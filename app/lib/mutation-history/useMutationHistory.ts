import { useSyncExternalStore } from "react"
import { getEntries, subscribeEntries } from "./store"
import type { HistoryEntry } from "./types"

export const useMutationHistory = (): HistoryEntry[] =>
  useSyncExternalStore(subscribeEntries, getEntries, getEntries)
