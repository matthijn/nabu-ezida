import type { Block, SystemBlock } from "../types"
import { combine, type Nudger, type Files } from "./nudge"
import { getCodebookFiles } from "~/lib/files"

const WRITE_INTERVAL = 15
const READ_MARKER = "## READ MEMORY"
const WRITE_MARKER = "## WRITE REMINDER: Only if needed"

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

const afterToolResult = (history: Block[]): boolean =>
  history.length > 0 && history[history.length - 1].type === "tool_result"

const alreadyFired = (history: Block[], marker: string): boolean =>
  blocksSinceMarker(history, marker) !== -1

const firedWithin = (history: Block[], marker: string, n: number): boolean => {
  const since = blocksSinceMarker(history, marker)
  if (since === -1) return history.length <= n
  return since <= n
}

const MEMORY_FILE = "memory.hidden.md"

const readMemoryNudge: Nudger = (history, files) => {
  if (!afterToolResult(history)) return null
  if (alreadyFired(history, READ_MARKER)) return null

  const memory = files[MEMORY_FILE]
  if (!memory) return null

  return `
${READ_MARKER}
<memory>
${memory.raw}
</memory>

Continue.
`
}

const writeMemoryNudge: Nudger = (history, files) => {
  if (!afterToolResult(history)) return null
  if (firedWithin(history, WRITE_MARKER, WRITE_INTERVAL)) return null

  const codeFiles = getCodebookFiles(files)
  const codebookPart =
    codeFiles.length > 0
      ? ` and/or codebook(s) in: ${codeFiles.join(", ")}`
      : ""

  return `
${WRITE_MARKER}
Update memory.hidden.md${codebookPart} if needed, then continue.
`
}

export const memoryNudge: Nudger = combine(readMemoryNudge, writeMemoryNudge)
