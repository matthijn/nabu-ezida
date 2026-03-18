// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => void
type DebouncedFn<T extends AnyFn> = T & { cancel: () => void }

interface DebounceOptions {
  maxWait?: number
}

export const debounce = <T extends AnyFn>(
  fn: T,
  delay: number,
  options?: DebounceOptions
): DebouncedFn<T> => {
  let timeout: ReturnType<typeof setTimeout> | null = null
  let firstCall: number | null = null
  const maxWait = options?.maxWait

  const flush = (...args: Parameters<T>): void => {
    if (timeout) clearTimeout(timeout)
    timeout = null
    firstCall = null
    fn(...args)
  }

  const debounced = ((...args: Parameters<T>) => {
    const now = Date.now()
    if (firstCall === null) firstCall = now

    if (timeout) clearTimeout(timeout)

    if (maxWait && now - firstCall >= maxWait) {
      flush(...args)
      return
    }

    timeout = setTimeout(() => flush(...args), delay)
  }) as DebouncedFn<T>

  debounced.cancel = () => {
    if (timeout) clearTimeout(timeout)
    timeout = null
    firstCall = null
  }

  return debounced
}

interface ScopedEntry {
  timer: ReturnType<typeof setTimeout>
  controller: AbortController | null
}

interface ScopedDebounce {
  call: (key: string, fn: (signal: AbortSignal) => Promise<void>) => void
  cancel: (key: string) => void
  cancelAll: () => void
}

export const createScopedDebounce = (delay: number): ScopedDebounce => {
  const entries = new Map<string, ScopedEntry>()

  const cancel = (key: string): void => {
    const entry = entries.get(key)
    if (!entry) return
    clearTimeout(entry.timer)
    entry.controller?.abort()
    entries.delete(key)
  }

  const cancelAll = (): void => {
    for (const key of entries.keys()) {
      cancel(key)
    }
  }

  const call = (key: string, fn: (signal: AbortSignal) => Promise<void>): void => {
    cancel(key)

    const timer = setTimeout(() => {
      const controller = new AbortController()
      const entry = entries.get(key)
      if (entry) entry.controller = controller

      fn(controller.signal)
        .catch(() => undefined)
        .finally(() => entries.delete(key))
    }, delay)

    entries.set(key, { timer, controller: null })
  }

  return { call, cancel, cancelAll }
}
