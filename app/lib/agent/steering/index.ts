import type { Block } from "../types"
import type { Files } from "../derived"
import type { MultiNudger } from "./nudge-tools"
import { buildNudge, type NudgeTools } from "./nudges"

export { type NudgeTools } from "./nudges"

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

export const createToNudge = (tools: NudgeTools, talk: boolean, getFiles: () => Files): MultiNudger => {
  const nudge = buildNudge(tools, talk, getFiles)
  return (history) => nudge(excludeReasoning(history))
}
