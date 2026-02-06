import type { Block } from "../types"
import type { Files } from "../derived"
import type { MultiNudger } from "./nudge-tools"
import { createNudge } from "./nudges"

export {
  type Nudger,
  type MultiNudger,
  type NudgeBlock,
  combine,
  collect,
  isEmptyNudgeBlock,
  systemNudge,
  emptyNudge,
  withContext,
} from "./nudge-tools"

const excludeReasoning = (history: Block[]): Block[] =>
  history.filter((b) => b.type !== "reasoning")

export const createToNudge = (getFiles: () => Files): MultiNudger => {
  const nudge = createNudge(getFiles)
  return (history) => nudge(excludeReasoning(history))
}
