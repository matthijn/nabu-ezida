import type { Block } from "../types"

type InterpretEntry = {
  id: number
  expert: string
  task: string | null
  messages: Block[]
  response: Block[]
  timestamp: number
  streaming?: string
  streamingReasoning?: string
}

let entries: InterpretEntry[] = []
let nextId = 1
let activeId: number | null = null
let listeners: (() => void)[] = []

const notify = (): void => listeners.forEach((l) => l())

type StartEntryParams = {
  expert: string
  task: string | null
  messages: Block[]
}

export const startInterpretEntry = ({ expert, task, messages }: StartEntryParams): number => {
  const id = nextId++
  activeId = id
  entries = [...entries, { id, expert, task, messages, response: [], timestamp: Date.now(), streaming: "", streamingReasoning: "" }]
  notify()
  return id
}

export const updateInterpretStreaming = (id: number, chunk: string): void => {
  entries = entries.map((e) => (e.id === id ? { ...e, streaming: (e.streaming ?? "") + chunk } : e))
  notify()
}

export const updateInterpretReasoning = (id: number, chunk: string): void => {
  entries = entries.map((e) => (e.id === id ? { ...e, streamingReasoning: (e.streamingReasoning ?? "") + chunk } : e))
  notify()
}

export const completeInterpretEntry = (id: number, response: Block[]): void => {
  entries = entries.map((e) => (e.id === id ? { ...e, response, streaming: undefined, streamingReasoning: undefined } : e))
  activeId = null
  notify()
}

export const getInterpretEntries = (): InterpretEntry[] => entries

export const clearInterpretEntries = (): void => {
  entries = []
  nextId = 1
  activeId = null
  notify()
}

export const subscribeInterpret = (listener: () => void): (() => void) => {
  listeners = [...listeners, listener]
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

export type { InterpretEntry }
