import type { ParseCallbacks } from "./stream"
import type { Caller } from "./caller"

export type StreamingContext = {
  callbacks: ParseCallbacks
  reset: () => void
  signal?: AbortSignal
}

let current: StreamingContext | null = null

export const setStreamingContext = (ctx: StreamingContext): void => {
  current = ctx
}

export const clearStreamingContext = (): void => {
  current = null
}

export const getStreamingCallbacks = (): ParseCallbacks | undefined =>
  current?.callbacks ?? undefined

export const withStreamingReset = (caller: Caller): Caller =>
  async (history, signal) => {
    current?.reset()
    return caller(history, current?.signal ?? signal)
  }
