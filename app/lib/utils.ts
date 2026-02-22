import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const isAbortError = (e: unknown): boolean =>
  e instanceof Error && e.name === "AbortError"

export const toSnakeCase = (str: string): string =>
  str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => void
export type DebouncedFn<T extends AnyFn> = T & { cancel: () => void }

type DebounceOptions = { maxWait?: number }

export const debounce = <T extends AnyFn>(fn: T, delay: number, options?: DebounceOptions): DebouncedFn<T> => {
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

type CappedCache<K, V> = {
  get: (key: K) => V | undefined
  has: (key: K) => boolean
  set: (key: K, value: V) => void
}

export const createCappedCache = <K, V>(max: number): CappedCache<K, V> => {
  const map = new Map<K, V>()
  return {
    get: (key) => map.get(key),
    has: (key) => map.has(key),
    set: (key, value) => {
      if (map.size >= max && !map.has(key)) {
        const firstKey = map.keys().next().value!
        map.delete(firstKey)
      }
      map.set(key, value)
    },
  }
}

type CollectedFn<T> = ((items: T[]) => void) & { flush: () => void; clear: () => void }

export const collect = <T>(fn: (items: T[]) => void): CollectedFn<T> => {
  let accumulated = new Set<T>()

  const collected = ((items: T[]) => {
    for (const item of items) accumulated.add(item)
  }) as CollectedFn<T>

  collected.flush = () => {
    if (accumulated.size > 0) {
      fn(Array.from(accumulated))
      accumulated = new Set()
    }
  }

  collected.clear = () => {
    accumulated = new Set()
  }

  return collected
}

const timeUnits: [number, Intl.RelativeTimeFormatUnit][] = [
  [60, "second"],
  [60, "minute"],
  [24, "hour"],
  [7, "day"],
  [4, "week"],
  [12, "month"],
  [Infinity, "year"],
]

export function timeAgo(date: Date): string {
  let diff = (date.getTime() - Date.now()) / 1000

  for (const [amount, unit] of timeUnits) {
    if (Math.abs(diff) < amount) {
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
        Math.round(diff),
        unit
      )
    }
    diff /= amount
  }
  return ""
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sampleAndHold = <A extends any[], R>(fn: (...args: A) => R, holdMs: number): (...args: A) => R => {
  let heldValue: R | undefined
  let heldUntil = 0

  return (...args: A): R => {
    const now = Date.now()
    if (now < heldUntil) return heldValue as R
    heldValue = fn(...args)
    heldUntil = now + holdMs
    return heldValue
  }
}

type ScopedEntry = {
  timer: ReturnType<typeof setTimeout>
  controller: AbortController | null
}

type ScopedDebounce = {
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
        .catch(() => {})
        .finally(() => entries.delete(key))
    }, delay)

    entries.set(key, { timer, controller: null })
  }

  return { call, cancel, cancelAll }
}
