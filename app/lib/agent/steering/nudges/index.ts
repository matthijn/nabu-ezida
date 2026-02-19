import type { Files } from "../../derived"
import type { Nudger } from "../nudge-tools"
import { shellNudge } from "./shell"

export const buildToolNudges = (_getFiles: () => Files): Record<string, Nudger[]> => ({
  run_local_shell: [shellNudge],
})
