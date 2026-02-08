import type { Block, BlockOrigin } from "./types"

export type TaggedBlock = Block & { origin: BlockOrigin }

let blocks: TaggedBlock[] = []
let listeners: (() => void)[] = []

const notify = (): void => listeners.forEach((l) => l())

export const pushBlocks = (newBlocks: TaggedBlock[]): void => {
  blocks = [...blocks, ...newBlocks]
  recomputeInstances()
  notify()
}

export const tagBlocks = (origin: BlockOrigin, raw: Block[]): TaggedBlock[] =>
  raw.map((block) => ({ ...block, origin }))

export const getAllBlocks = (): TaggedBlock[] => blocks

export const getBlocksForInstance = (instance: string): TaggedBlock[] =>
  blocks.filter((b) => b.origin.instance === instance)

let cachedInstances: string[] = []

const recomputeInstances = (): void => {
  cachedInstances = [...new Set(blocks.map((b) => b.origin.instance))]
}

export const getInstances = (): string[] => cachedInstances

export const clearBlocks = (): void => {
  blocks = []
  cachedInstances = []
  notify()
}

export const subscribeBlocks = (listener: () => void): (() => void) => {
  listeners = [...listeners, listener]
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}
