import { combine, collect } from "../nudge-tools"
import { explorationNudge } from "./exploration"
import { planNudge } from "./plan"
import { baselineNudge } from "./baseline"
import { memoryNudge } from "./memory"
import { shellNudge } from "./shell"

const orchestrationNudge = combine(explorationNudge, planNudge, baselineNudge)

export const nudge = collect(orchestrationNudge, memoryNudge, shellNudge)
