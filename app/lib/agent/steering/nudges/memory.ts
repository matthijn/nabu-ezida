import { afterToolResult, alreadyFired, systemNudge, type Nudger } from "../nudge-tools"
import type { Files } from "../../derived"
import { PREFERENCES_FILE } from "~/lib/files/filename"

const READ_MARKER = "## READ MEMORY"

export const createMemoryNudge = (getFiles: () => Files): Nudger => (history) => {
  if (!afterToolResult(history)) return null
  if (alreadyFired(history, READ_MARKER)) return null

  const memory = getFiles()[PREFERENCES_FILE]
  if (!memory) return null

  return systemNudge(`
${READ_MARKER}
<file ${PREFERENCES_FILE}>
${memory}
</file ${PREFERENCES_FILE}>

Continue.
`)
}
