import type { Block } from "./types"

export const appendBlock = (history: Block[], block: Block): Block[] => [...history, block]

export const appendBlocks = (history: Block[], blocks: Block[]): Block[] => [...history, ...blocks]
