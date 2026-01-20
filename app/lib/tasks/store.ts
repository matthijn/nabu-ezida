type Listener = (tasks: Map<string, string>) => void

let pendingTasks = new Map<string, string>()
const listeners = new Set<Listener>()

const notify = (): void => {
  for (const listener of listeners) {
    listener(pendingTasks)
  }
}

export const addTask = (key: string, displayName: string): void => {
  pendingTasks = new Map(pendingTasks)
  pendingTasks.set(key, displayName)
  notify()
}

export const removeTask = (key: string): void => {
  if (!pendingTasks.has(key)) return
  pendingTasks = new Map(pendingTasks)
  pendingTasks.delete(key)
  notify()
}

export const subscribe = (listener: Listener): (() => void) => {
  listeners.add(listener)
  listener(pendingTasks)
  return () => listeners.delete(listener)
}

export const getTaskMessage = (tasks: Map<string, string>): string | null => {
  if (tasks.size === 0) return null
  const [first] = tasks.values()
  if (tasks.size === 1) return `Analyzing ${first}`
  return `Analyzing ${first} (+${tasks.size - 1})`
}
