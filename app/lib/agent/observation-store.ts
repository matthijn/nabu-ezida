import type { Block } from "./types"

export type ObservationEntry = {
  id: number
  name: string
  endpoint: string
  messages: Block[]
  response: Block[]
  timestamp: number
  streaming?: string
  streamingReasoning?: string
}

let entries: ObservationEntry[] = []
let nextId = 1
let listeners: (() => void)[] = []

const notify = (): void => listeners.forEach((l) => l())

export const startObservation = (name: string, endpoint: string, messages: Block[]): number => {
  const id = nextId++
  entries = [...entries, { id, name, endpoint, messages, response: [], timestamp: Date.now(), streaming: "", streamingReasoning: "" }]
  notify()
  return id
}

export const updateObservationStreaming = (id: number, chunk: string): void => {
  entries = entries.map((e) => (e.id === id ? { ...e, streaming: (e.streaming ?? "") + chunk } : e))
  notify()
}

export const updateObservationReasoning = (id: number, chunk: string): void => {
  entries = entries.map((e) => (e.id === id ? { ...e, streamingReasoning: (e.streamingReasoning ?? "") + chunk } : e))
  notify()
}

export const completeObservation = (id: number, response: Block[]): void => {
  entries = entries.map((e) => (e.id === id ? { ...e, response, streaming: undefined, streamingReasoning: undefined } : e))
  notify()
}

export const getObservationEntries = (): ObservationEntry[] => entries

export const clearObservationEntries = (): void => {
  entries = []
  nextId = 1
  notify()
}

export const subscribeObservations = (listener: () => void): (() => void) => {
  listeners = [...listeners, listener]
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}
