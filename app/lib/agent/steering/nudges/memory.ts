import { afterToolResult, alreadyFired, systemNudge, type Nudger } from "../nudge-tools"
import type { Files } from "../../derived"

const READ_MARKER = "## READ MEMORY"
const MEMORY_FILE = "memory.hidden.md"

export const createMemoryNudge = (getFiles: () => Files): Nudger => (history) => {
  if (!afterToolResult(history)) return null
  if (alreadyFired(history, READ_MARKER)) return null

  const memory = getFiles()[MEMORY_FILE]
  if (!memory) return null

  return systemNudge(`
${READ_MARKER}
<file ${MEMORY_FILE}>
${memory}
</file ${MEMORY_FILE}>

Continue.
`)
}
