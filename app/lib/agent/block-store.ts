import type { Block } from "./types"

let blocks: Block[] = []
let listeners: (() => void)[] = []
let draft: Block | null = null
let draftListeners: (() => void)[] = []
let loading = false
let loadingListeners: (() => void)[] = []

const notify = (): void => listeners.forEach((l) => l())
const notifyDraft = (): void => draftListeners.forEach((l) => l())
const notifyLoading = (): void => loadingListeners.forEach((l) => l())

export const pushBlocks = (newBlocks: Block[]): void => {
  blocks = [...blocks, ...newBlocks]
  draft = null
  notify()
  notifyDraft()
}

export const setDraft = (block: Block): void => {
  draft = block
  notifyDraft()
}

export const getDraft = (): Block | null => draft

export const clearDraft = (): void => {
  draft = null
  notifyDraft()
}

export const subscribeDraft = (listener: () => void): (() => void) => {
  draftListeners = [...draftListeners, listener]
  return () => {
    draftListeners = draftListeners.filter((l) => l !== listener)
  }
}

export const setLoading = (value: boolean): void => {
  loading = value
  notifyLoading()
}

export const getLoading = (): boolean => loading

export const subscribeLoading = (listener: () => void): (() => void) => {
  loadingListeners = [...loadingListeners, listener]
  return () => {
    loadingListeners = loadingListeners.filter((l) => l !== listener)
  }
}

export const getAllBlocks = (): Block[] => blocks

export const clearBlocks = (): void => {
  blocks = []
  notify()
}

export const subscribeBlocks = (listener: () => void): (() => void) => {
  listeners = [...listeners, listener]
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}
