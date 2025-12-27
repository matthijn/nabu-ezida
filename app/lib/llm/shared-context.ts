import type { BlockSummary } from "~/domain/llm"

type SharedContextStore = {
  summaries: BlockSummary[]
  listeners: Set<() => void>
}

const store: SharedContextStore = {
  summaries: [],
  listeners: new Set(),
}

export const getSharedContext = (): BlockSummary[] => store.summaries

export const pushSharedContext = (summary: BlockSummary): void => {
  store.summaries = [...store.summaries, summary]
  store.listeners.forEach((listener) => listener())
}

export const clearSharedContext = (): void => {
  store.summaries = []
  store.listeners.forEach((listener) => listener())
}

export const subscribeToSharedContext = (listener: () => void): (() => void) => {
  store.listeners.add(listener)
  return () => store.listeners.delete(listener)
}
