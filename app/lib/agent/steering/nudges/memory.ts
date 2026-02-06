import { combine, afterToolResult, alreadyFired, firedWithin, systemNudge, type Nudger } from "../nudge-tools"
import type { Files } from "../../derived"
import { getCodebookFiles } from "~/lib/files/selectors"

const WRITE_INTERVAL = 15
const READ_MARKER = "## READ MEMORY"
const WRITE_MARKER = "## WRITE REMINDER: Only if needed"

const MEMORY_FILE = "memory.hidden.md"

export const createMemoryNudge = (getFiles: () => Files): Nudger => {
  const readMemoryNudge: Nudger = (history) => {
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

  const writeMemoryNudge: Nudger = (history) => {
    if (!afterToolResult(history)) return null
    if (firedWithin(history, WRITE_MARKER, WRITE_INTERVAL)) return null

    const codeFiles = getCodebookFiles(getFiles())
    const codebookPart =
      codeFiles.length > 0
        ? ` and/or codebook(s) in: ${codeFiles.join(", ")}`
        : ""

    return systemNudge(`
${WRITE_MARKER}
Update memory.hidden.md${codebookPart} if needed, then continue.
`)
  }

  return combine(readMemoryNudge, writeMemoryNudge)
}
