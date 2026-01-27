import { combine, afterToolResult, alreadyFired, firedWithin, type Nudger } from "../nudge-tools"
import { getCodebookFiles } from "~/lib/files"

const WRITE_INTERVAL = 15
const READ_MARKER = "## READ MEMORY"
const WRITE_MARKER = "## WRITE REMINDER: Only if needed"

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
