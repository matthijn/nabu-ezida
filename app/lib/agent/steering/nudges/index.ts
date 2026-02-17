import type { Files } from "../../derived"
import type { Nudger } from "../nudge-tools"
import { createOrientationNudge, orientationStartNudge } from "./orientation"
import { shellNudge } from "./shell"

export const buildToolNudges = (getFiles: () => Files): Record<string, Nudger[]> => ({
  orientate: [createOrientationNudge(getFiles), orientationStartNudge],
  run_local_shell: [shellNudge],
})
