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
  block: BlockContext | null
}

export type ChatState = {
  initiator: Participant
  recipient: Participant
  currentContext: DocumentContext | null
  lastSentContext: DocumentContext | null
  history: Block[]
  streaming: string
}

let chat: ChatState | null = null
let listeners: Set<() => void> = new Set()

const notify = (): void => {
  listeners.forEach((l) => l())
}

export const openChat = (
  initiator: Participant,
  recipient: Participant,
  currentContext: DocumentContext | null = null
): void => {
  chat = {
    initiator,
    recipient,
    currentContext,
    lastSentContext: null,
    history: [],
    streaming: "",
  }
  notify()
}

export const updateCurrentContext = (context: DocumentContext | null): void => {
  if (!chat) return
  chat = { ...chat, currentContext: context }
  notify()
}

const contextsEqual = (a: DocumentContext | null, b: DocumentContext | null): boolean => {
  if (a === b) return true
  if (!a || !b) return false
  if (a.documentId !== b.documentId) return false
  if (a.documentName !== b.documentName) return false
  if (a.block === b.block) return true
  if (!a.block || !b.block) return false
  return a.block.id === b.block.id && a.block.textContent === b.block.textContent
}

export const getContextIfChanged = (): DocumentContext | null => {
  if (!chat) return null
  if (contextsEqual(chat.currentContext, chat.lastSentContext)) return null
  return chat.currentContext
}

export const markContextSent = (): void => {
  if (!chat) return
  chat = { ...chat, lastSentContext: chat.currentContext }
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
