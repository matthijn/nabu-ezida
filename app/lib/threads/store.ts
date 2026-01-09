import type { Participant } from "~/domain/participant"
import type { Block } from "~/lib/agent"

export type BlockContext = {
  id: string
  type: string
  textContent: string
}

export type DocumentContext = {
  documentId: string
  documentName: string
  blockBefore: BlockContext | null
  blockAfter: BlockContext | null
}

export type ThreadState = {
  id: string
  initiator: Participant
  recipient: Participant
  documentContext: DocumentContext | null
  agentHistory: Block[]
  streaming: string
}

type ThreadStoreState = Map<string, ThreadState>

type ThreadAction =
  | { type: "create"; thread: ThreadState }
  | { type: "update"; id: string; updates: Partial<Omit<ThreadState, "id">> }
  | { type: "delete"; id: string }

const threadReducer = (state: ThreadStoreState, action: ThreadAction): ThreadStoreState => {
  switch (action.type) {
    case "create": {
      const next = new Map(state)
      next.set(action.thread.id, action.thread)
      return next
    }
    case "update": {
      const thread = state.get(action.id)
      if (!thread) return state
      const next = new Map(state)
      next.set(action.id, { ...thread, ...action.updates })
      return next
    }
    case "delete": {
      const next = new Map(state)
      next.delete(action.id)
      return next
    }
    default: {
      const exhaustive: never = action
      throw new Error(`Unknown action: ${(exhaustive as ThreadAction).type}`)
    }
  }
}

let threads: ThreadStoreState = new Map()
const listeners: Map<string, Set<() => void>> = new Map()

const notifyListeners = (threadId: string): void => {
  listeners.get(threadId)?.forEach((listener) => listener())
}

const dispatch = (action: ThreadAction): void => {
  const affectedId = "id" in action ? action.id : action.type === "create" ? action.thread.id : null
  threads = threadReducer(threads, action)
  if (affectedId) notifyListeners(affectedId)
}

export const createThread = (
  id: string,
  initiator: Participant,
  recipient: Participant,
  initialMessage: string,
  documentContext: DocumentContext | null = null
): ThreadState => {
  const thread: ThreadState = {
    id,
    initiator,
    recipient,
    documentContext,
    agentHistory: [{ type: "user", content: initialMessage }],
    streaming: "",
  }
  dispatch({ type: "create", thread })
  return thread
}

export const getThread = (id: string): ThreadState | undefined => threads.get(id)

export const updateThread = (id: string, updates: Partial<Omit<ThreadState, "id">>): void => {
  dispatch({ type: "update", id, updates })
}

export const deleteThread = (id: string): void => {
  dispatch({ type: "delete", id })
  listeners.delete(id)
}

export const clearAllThreads = (): void => {
  threads = new Map()
  listeners.clear()
}

export const subscribeToThread = (id: string, listener: () => void): (() => void) => {
  if (!listeners.has(id)) listeners.set(id, new Set())
  listeners.get(id)!.add(listener)
  return () => listeners.get(id)?.delete(listener)
}
