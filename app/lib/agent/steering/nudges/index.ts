import { combine, collect } from "../nudge-tools"
import { explorationNudge, explorationStartNudge } from "./exploration"
import { planNudge } from "./plan"
import { baselineNudge } from "./baseline"
import { memoryNudge } from "./memory"
import { shellNudge, grepNudge } from "./shell"
import { toneNudge } from "./tone"

const orchestrationNudge = combine(explorationNudge, planNudge, baselineNudge)

export const nudge = collect(orchestrationNudge, /*memoryNudge,*/ shellNudge, grepNudge, explorationStartNudge, toneNudge)
