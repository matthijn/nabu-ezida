import type { Files } from "../../derived"
import type { Nudger } from "../nudge-tools"
import { shellNudge } from "./shell"
import { guidanceNudge } from "./guidance"

export const buildToolNudges = (_getFiles: () => Files): Record<string, Nudger[]> => ({
  run_local_shell: [shellNudge],
  preflight: [guidanceNudge],
})
