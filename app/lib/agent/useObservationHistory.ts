import { useSyncExternalStore } from "react"
import { getObservationEntries, subscribeObservations, type ObservationEntry } from "./observation-store"

export const useObservationHistory = (): ObservationEntry[] =>
  useSyncExternalStore(subscribeObservations, getObservationEntries, getObservationEntries)
