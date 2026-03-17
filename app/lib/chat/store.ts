import type { Participant } from "~/domain/participant"

export interface ChatState {
  initiator: Participant
  recipient: Participant
}

let chat: ChatState | null = null
const listeners = new Set<() => void>()

const notify = (): void => {
  listeners.forEach((l) => l())
}

export const openChat = (initiator: Participant, recipient: Participant): void => {
  chat = { initiator, recipient }
  notify()
}

export const getChat = (): ChatState | null => chat

export const closeChat = (): void => {
  chat = null
  notify()
}

export const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
