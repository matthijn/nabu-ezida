import { useSyncExternalStore } from "react"
import { getInterpretEntries, subscribeInterpret, type InterpretEntry } from "./interpret-store"

export const useInterpretHistory = (): InterpretEntry[] =>
  useSyncExternalStore(subscribeInterpret, getInterpretEntries, getInterpretEntries)
