import type { Block, BlockOrigin } from "./types"
import type { Caller } from "./caller"
import { pushBlocks, tagBlocks } from "./block-store"

export type AgentNudge = (history: Block[]) => Promise<Block[]>

export const noNudge: AgentNudge = async () => []

export const runAgent = async (
  origin: BlockOrigin,
  caller: Caller,
  nudge: AgentNudge,
  readBlocks: () => Block[],
): Promise<void> => {
  while (true) {
    await caller()
    const nudges = await nudge(readBlocks())
    if (nudges.length === 0) return
    pushBlocks(tagBlocks(origin, nudges))
  }
}
