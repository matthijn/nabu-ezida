import { combine, collect } from "../nudge-tools"
import { orientationNudge, orientationStartNudge } from "./orientation"
import { planNudge } from "./plan"
import { baselineNudge } from "./baseline"
import { memoryNudge } from "./memory"
import { shellNudge, grepNudge } from "./shell"
import { toneNudge } from "./tone"

const orchestrationNudge = combine(orientationNudge, planNudge, baselineNudge)

export const nudge = collect(orchestrationNudge, /*memoryNudge,*/ shellNudge, grepNudge, orientationStartNudge, toneNudge)
