import type { Block } from "./types"

export const isDraft = (block: Block): boolean =>
  "draft" in block && block.draft === true

let blocks: Block[] = []
let listeners: (() => void)[] = []
let loading = false
let loadingListeners: (() => void)[] = []

const notify = (): void => listeners.forEach((l) => l())
const notifyLoading = (): void => loadingListeners.forEach((l) => l())

const lastIsDraft = (): boolean =>
  blocks.length > 0 && isDraft(blocks[blocks.length - 1])

const stripDraft = (bs: Block[]): Block[] =>
  bs.length > 0 && isDraft(bs[bs.length - 1]) ? bs.slice(0, -1) : bs

export const pushBlocks = (newBlocks: Block[]): void => {
  blocks = [...stripDraft(blocks), ...newBlocks]
  notify()
}

export const setDraft = (block: Block): void => {
  const tagged = { ...block, draft: true as const }
  blocks = lastIsDraft()
    ? [...blocks.slice(0, -1), tagged]
    : [...blocks, tagged]
  notify()
}

export const getDraft = (): Block | null => {
  const last = blocks[blocks.length - 1]
  return last && isDraft(last) ? last : null
}

export const clearDraft = (): void => {
  if (!lastIsDraft()) return
  blocks = blocks.slice(0, -1)
  notify()
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

export const getAllBlocks = (): Block[] => blocks.filter((b) => !isDraft(b))

export const getAllBlocksWithDraft = (): Block[] => blocks

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
