import { afterToolResult, alreadyFired, systemNudge, type Nudger } from "../nudge-tools"
import type { FileStore } from "~/lib/files"
import { SETTINGS_FILE } from "~/lib/files/filename"

const READ_MARKER = "## READ SETTINGS"

export const createSettingsNudge =
  (getFiles: () => FileStore): Nudger =>
  (history) => {
    if (!afterToolResult(history)) return null
    if (alreadyFired(history, READ_MARKER)) return null

    const settings = getFiles()[SETTINGS_FILE]
    if (!settings) return null

    return systemNudge(`
${READ_MARKER}
<file ${SETTINGS_FILE}>
${settings}
</file ${SETTINGS_FILE}>

Continue.
`)
  }
