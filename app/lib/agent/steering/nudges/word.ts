import type { Block } from "../../types"
import { firedWithin, systemNudge, type Nudger } from "../nudge-tools"

type WordNudgeConfig = {
  word: string
  prompt: string
  lookback: number
}

const getBlockText = (block: Block): string => {
  switch (block.type) {
    case "text":
    case "user":
    case "system":
    case "reasoning":
      return block.content
    case "tool_call":
      return JSON.stringify(block.calls)
    case "tool_result":
      return JSON.stringify(block.result)
    case "empty_nudge":
      return ""
  }
}

const wordFoundInLookback = (history: Block[], word: string, lookback: number): boolean => {
  const start = Math.max(0, history.length - lookback)
  const pattern = new RegExp(word, "i")
  for (let i = start; i < history.length; i++) {
    if (pattern.test(getBlockText(history[i]))) {
      return true
    }
  }
  return false
}

const makeMarker = (word: string): string => `<!-- word-nudge:${word} -->`

export const buildWordNudge =
  ({ word, prompt, lookback }: WordNudgeConfig): Nudger =>
  (history) => {
    const marker = makeMarker(word)
    if (firedWithin(history, marker, lookback)) return null
    if (!wordFoundInLookback(history, word, lookback)) return null
    return systemNudge(`${marker}\n${prompt}`)
  }
