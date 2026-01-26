import type { Block } from "../types"
import { collect, type MultiNudger } from "./nudge"
import { toolOrchestrationNudge } from "./tool-orchestration"
import { memoryNudge } from "./memory"

export { combine, collect, type Nudger, type MultiNudger } from "./nudge"
export { toolOrchestrationNudge } from "./tool-orchestration"
export { memoryNudge } from "./memory"

const lastBlockType = (history: Block[]): string =>
  history[history.length - 1]?.type ?? "empty"

const nudge = collect(toolOrchestrationNudge, memoryNudge)

export const toNudge: MultiNudger = (history) => {
  const results = nudge(history)
  console.log(`[Nudge] ${lastBlockType(history)} → ${results.length} nudge(s)`)
  return results
}
