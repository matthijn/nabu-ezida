let open = false
const listeners = new Set<() => void>()

const notify = (): void => {
  listeners.forEach((l) => l())
}

export const openChat = (): void => {
  open = true
  notify()
}

export const isChatOpen = (): boolean => open

export const closeChat = (): void => {
  open = false
  notify()
}

export const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
