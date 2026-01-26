import type { Block } from "../types"
import type { Nudger } from "./nudge"

const MEMORY_INTERVAL = 15

const isToolResult = (block: Block): boolean => block.type === "tool_result"

const getWindow = (length: number): number =>
  Math.floor((length - 1) / MEMORY_INTERVAL)

const getWindowStart = (window: number): number =>
  window * MEMORY_INTERVAL

const hasToolResultInRange = (history: Block[], start: number, end: number): boolean => {
  for (let i = start; i < end; i++) {
    if (isToolResult(history[i])) return true
  }
  return false
}

export const memoryNudge: Nudger = (history) => {
  if (history.length === 0) return null

  const lastIndex = history.length - 1
  if (!isToolResult(history[lastIndex])) return null

  const window = getWindow(history.length)
  const windowStart = getWindowStart(window)

  if (hasToolResultInRange(history, windowStart, lastIndex)) return null

  return `
    ## REMINDER: Only if needed
    - do you need to update any user preferences in memory.hidden.md and/or do you need to update any codebook changes? if so: update then continue with your current task
    - else continue with your current task
  `

}
