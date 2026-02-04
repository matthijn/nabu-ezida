import type { Block } from "../types"
import type { MultiNudger } from "./nudge-tools"
import { nudge } from "./nudges"

export {
  type Nudger,
  type MultiNudger,
  type NudgeBlock,
  combine,
  collect,
  isEmptyNudgeBlock,
  newErrorBlock,
  systemNudge,
  emptyNudge,
  withContext,
} from "./nudge-tools"

const excludeReasoning = (history: Block[]): Block[] =>
  history.filter((b) => b.type !== "reasoning")

export const toNudge: MultiNudger = (history, files) => nudge(excludeReasoning(history), files)
