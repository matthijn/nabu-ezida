import type { Block } from "../types"
import type { MultiNudger } from "./nudge-tools"
import { nudge } from "./nudges"

export { type Nudger, type MultiNudger, combine, collect } from "./nudge-tools"

const lastBlockType = (history: Block[]): string =>
  history[history.length - 1]?.type ?? "empty"

export const toNudge: MultiNudger = (history, files) => {
  const results = nudge(history, files)
  console.log(`[Nudge] ${lastBlockType(history)} → ${results.length} nudge(s)`)
  return results
}
