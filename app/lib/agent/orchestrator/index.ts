import type { Block } from "../types"
import { collect, type MultiNudger, type Files } from "./nudge"
import { toolOrchestrationNudge } from "./tool-orchestration"
import { memoryNudge } from "./memory"
import { shellNudge } from "./shell"

export { combine, collect, type Nudger, type MultiNudger, type Files } from "./nudge"
export { toolOrchestrationNudge } from "./tool-orchestration"
export { memoryNudge } from "./memory"
export { shellNudge } from "./shell"

const lastBlockType = (history: Block[]): string =>
  history[history.length - 1]?.type ?? "empty"

const nudge = collect(toolOrchestrationNudge, memoryNudge, shellNudge)

export const toNudge: MultiNudger = (history, files) => {
  const results = nudge(history, files)
  console.log(`[Nudge] ${lastBlockType(history)} → ${results.length} nudge(s)`)
  return results
}
