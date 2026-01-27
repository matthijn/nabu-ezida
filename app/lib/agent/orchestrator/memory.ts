import type { Block, SystemBlock } from "../types"
import { combine, type Nudger, type Files } from "./nudge"

const WRITE_INTERVAL = 15
const READ_MARKER = "## READ MEMORY"
const WRITE_MARKER = "## REMINDER: Only if needed"

const isToolResult = (block: Block): boolean => block.type === "tool_result"
const isSystem = (block: Block): block is SystemBlock => block.type === "system"

const blocksSinceMarker = (history: Block[], marker: string): number => {
  for (let i = history.length - 1; i >= 0; i--) {
    const block = history[i]
    if (isSystem(block) && block.content.includes(marker)) {
      return history.length - 1 - i
    }
  }
  return -1
}

const readMemoryNudge: Nudger = (history, _files) => {
  if (history.length === 0) return null
  if (!isToolResult(history[history.length - 1])) return null
  if (blocksSinceMarker(history, READ_MARKER) !== -1) return null

  return `
    ${READ_MARKER}
    - Read memory.hidden.md if it exists to understand user preferences and context
    - Then continue with your current task
  `
}

const writeMemoryNudge: Nudger = (history, _files) => {
  if (history.length === 0) return null
  if (!isToolResult(history[history.length - 1])) return null
  const since = blocksSinceMarker(history, WRITE_MARKER)
  if (since === -1 && history.length <= WRITE_INTERVAL) return null
  if (since !== -1 && since <= WRITE_INTERVAL) return null

  return `
    ${WRITE_MARKER}
    - do you need to update any user preferences in memory.hidden.md and/or do you need to update any codebook changes? if so: update then continue with your current task
    - else continue with your current task
  `
}

export const memoryNudge: Nudger = combine(readMemoryNudge, writeMemoryNudge)
