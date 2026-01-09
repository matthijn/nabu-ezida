import type { Block } from "./types"

export const appendBlock = (history: Block[], block: Block): Block[] => [...history, block]
