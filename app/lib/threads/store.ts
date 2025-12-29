import type { Participant } from "~/domain/participant"
import type { CompactionBlock } from "~/lib/llm"

export type ConversationMessage = {
  from: Participant
  content: string
}

export type ThreadStatus = "idle" | "executing" | "done"

export type ThreadState = {
  id: string
  initiator: Participant
  recipient: Participant
  messages: ConversationMessage[]
  compactions: CompactionBlock[]
  status: ThreadStatus
  streaming: string | null
}

type ThreadStore = {
  threads: Map<string, ThreadState>
  listeners: Map<string, Set<() => void>>
}

const store: ThreadStore = {
  threads: new Map(),
  listeners: new Map(),
}

const notifyListeners = (threadId: string): void => {
  const listeners = store.listeners.get(threadId)
  if (listeners) {
    listeners.forEach((listener) => listener())
  }
}

export const createThread = (
  id: string,
  initiator: Participant,
  recipient: Participant,
  initialMessage: string
): ThreadState => {
  const thread: ThreadState = {
    id,
    initiator,
    recipient,
    messages: [{ from: initiator, content: initialMessage }],
    compactions: [],
    status: "idle",
    streaming: null,
  }
  store.threads.set(id, thread)
  notifyListeners(id)
  return thread
}

export const getThread = (id: string): ThreadState | undefined =>
  store.threads.get(id)

export const updateThread = (id: string, updates: Partial<Omit<ThreadState, "id">>): void => {
  const thread = store.threads.get(id)
  if (!thread) return
  store.threads.set(id, { ...thread, ...updates })
  notifyListeners(id)
}

export const pushMessage = (id: string, message: ConversationMessage): void => {
  const thread = store.threads.get(id)
  if (!thread) return
  store.threads.set(id, { ...thread, messages: [...thread.messages, message] })
  notifyListeners(id)
}

export const pushCompaction = (id: string, compaction: CompactionBlock): void => {
  const thread = store.threads.get(id)
  if (!thread) return
  store.threads.set(id, { ...thread, compactions: [...thread.compactions, compaction] })
  notifyListeners(id)
}

export const deleteThread = (id: string): void => {
  store.threads.delete(id)
  store.listeners.delete(id)
}

export const clearAllThreads = (): void => {
  store.threads.clear()
  store.listeners.clear()
}

export const subscribeToThread = (id: string, listener: () => void): (() => void) => {
  if (!store.listeners.has(id)) {
    store.listeners.set(id, new Set())
  }
  store.listeners.get(id)!.add(listener)
  return () => {
    const listeners = store.listeners.get(id)
    if (listeners) {
      listeners.delete(listener)
    }
  }
}
