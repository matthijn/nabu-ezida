import type { BlockOrigin } from "./types"
import type { ParseCallbacks } from "./stream"

export type StreamingContext = {
  callbacks: ParseCallbacks
  reset: () => void
  signal?: AbortSignal
  callerOrigin?: BlockOrigin
  setLoading?: (loading: boolean) => void
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

export const getSetLoading = (): ((loading: boolean) => void) | undefined =>
  current?.setLoading

