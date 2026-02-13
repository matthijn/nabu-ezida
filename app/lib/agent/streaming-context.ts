import type { BlockOrigin } from "./types"
import type { ParseCallbacks } from "./stream"
import type { Caller } from "./caller"

export type StreamingContext = {
  callbacks: ParseCallbacks
  reset: () => void
  signal?: AbortSignal
  callerOrigin?: BlockOrigin
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

export const getStreamingSignal = (): AbortSignal | undefined =>
  current?.signal ?? undefined

export const getCallerOrigin = (): BlockOrigin | undefined =>
  current?.callerOrigin ?? undefined

export const withStreamingReset = (caller: Caller): Caller =>
  async (signal) => {
    current?.reset()
    return caller(current?.signal ?? signal)
  }
