import type { Block } from "./types"
import type { Caller } from "./caller"

export type AgentNudge = (history: Block[]) => Promise<Block[]>

export const noNudge: AgentNudge = async () => []

export const runAgent = async (
  caller: Caller,
  nudge: AgentNudge,
  initial: Block[]
): Promise<Block[]> => {
  let history = initial
  while (true) {
    history = await caller(history)
    const nudges = await nudge(history)
    if (nudges.length === 0) return history
    history = [...history, ...nudges]
  }
}
