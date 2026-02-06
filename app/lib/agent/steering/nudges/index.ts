import type { Files } from "../../derived"
import type { MultiNudger } from "../nudge-tools"
import { combine, collect } from "../nudge-tools"
import { createOrientationNudge, orientationStartNudge } from "./orientation"
import { createPlanNudge } from "./plan"
import { baselineNudge } from "./baseline"
import { shellNudge, grepNudge } from "./shell"
import { toneNudge } from "./tone"

export const createNudge = (getFiles: () => Files): MultiNudger => {
  const orchestrationNudge = combine(createOrientationNudge(getFiles), createPlanNudge(getFiles), baselineNudge)
  return collect(orchestrationNudge, shellNudge, grepNudge, orientationStartNudge, toneNudge)
}
