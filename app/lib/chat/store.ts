import type { Participant } from "~/domain/participant"
import type { Block } from "~/lib/agent"

export type ChatState = {
  initiator: Participant
  recipient: Participant
  history: Block[]
  streaming: string
  streamingToolName: string | null
  error: string | null
  loading: boolean
}

let chat: ChatState | null = null
let listeners: Set<() => void> = new Set()

const notify = (): void => {
  listeners.forEach((l) => l())
}

export const openChat = (
  initiator: Participant,
  recipient: Participant
): void => {
  chat = {
    initiator,
    recipient,
    history: [],
    streaming: "",
    streamingToolName: null,
    error: null,
    loading: false,
  }
  notify()
}

export const getChat = (): ChatState | null => chat

export const updateChat = (updates: Partial<ChatState>): void => {
  if (!chat) return
  chat = { ...chat, ...updates }
  notify()
}

export const closeChat = (): void => {
  chat = null
  notify()
}

export const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
