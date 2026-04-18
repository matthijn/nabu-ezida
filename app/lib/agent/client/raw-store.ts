export interface RawLlmCall {
  id: number
  endpoint: string
  requestBody: string
  rawResponse: string
  timestamp: number
  duration: number
}

let calls: RawLlmCall[] = []
let nextId = 1
let listeners: (() => void)[] = []

const notify = (): void => listeners.forEach((l) => l())

export const pushRawCall = (call: Omit<RawLlmCall, "id">): void => {
  calls = [...calls, { ...call, id: nextId++ }]
  notify()
}

export const getRawCalls = (): RawLlmCall[] => calls

export const clearRawCalls = (): void => {
  calls = []
  nextId = 1
  notify()
}

export const subscribeRawCalls = (listener: () => void): (() => void) => {
  listeners = [...listeners, listener]
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}
