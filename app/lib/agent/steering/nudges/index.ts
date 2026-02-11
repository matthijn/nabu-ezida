import type { Files } from "../../derived"
import type { MultiNudger, Nudger } from "../nudge-tools"
import { collect } from "../nudge-tools"
import { createOrientationNudge, orientationStartNudge } from "./orientation"
import { baselineNudge } from "./baseline"
import { shellNudge, grepNudge } from "./shell"
import { toneNudge } from "./tone"

export type NudgeTools = { name: string }[]

type NudgeBinding = {
  tools: string[]
  nudger: (getFiles: () => Files) => Nudger
}

const NUDGE_BINDINGS: NudgeBinding[] = [
  { tools: ["orientate"],       nudger: createOrientationNudge },
  { tools: ["orientate"],       nudger: () => orientationStartNudge },
  { tools: ["run_local_shell"], nudger: () => shellNudge },
  { tools: ["run_local_shell"], nudger: () => grepNudge },
]

const hasAny = (tools: NudgeTools, names: string[]): boolean =>
  names.some((n) => tools.some((t) => t.name === n))

export const buildNudge = (tools: NudgeTools, talk: boolean, getFiles: () => Files): MultiNudger => {
  const nudgers = NUDGE_BINDINGS
    .filter((b) => hasAny(tools, b.tools))
    .map((b) => b.nudger(getFiles))

  nudgers.push(baselineNudge)
  if (talk) nudgers.push(toneNudge)

  return collect(...nudgers)
}
