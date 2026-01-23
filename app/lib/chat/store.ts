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

const formatBlock = (block: Block): string => {
  switch (block.type) {
    case "user":
      return `[user] "${block.content.slice(0, 50)}${block.content.length > 50 ? "..." : ""}"`
    case "system":
      return `[system/nudge] "${block.content.slice(0, 50)}${block.content.length > 50 ? "..." : ""}"`
    case "text":
      return `[assistant] "${block.content.slice(0, 50)}${block.content.length > 50 ? "..." : ""}"`
    case "tool_call":
      return `[tool_call] ${block.calls.map(c => `${c.name}(${c.id})`).join(", ")}`
    case "tool_result":
      return `[tool_result] id=${block.callId}`
  }
}

const logHistoryChanges = (oldHistory: Block[], newHistory: Block[]): void => {
  if (newHistory.length <= oldHistory.length) return
  const added = newHistory.slice(oldHistory.length)
  for (const block of added) {
    console.log(`[History] + ${formatBlock(block)}`)
  }
}

export const updateChat = (updates: Partial<ChatState>): void => {
  if (!chat) return
  if (updates.history) {
    logHistoryChanges(chat.history, updates.history)
  }
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
