import type { FileStore } from "~/lib/files"
import type { Nudger } from "../nudge-tools"
import { shellNudge } from "./shell"
import { guidanceNudge } from "./guidance"
import { recordDecisionNudge } from "./record-decision"

export const buildToolNudges = (_getFiles: () => FileStore): Record<string, Nudger[]> => ({
  run_local_shell: [shellNudge],
  preflight: [guidanceNudge],
  ask: [recordDecisionNudge],
})
