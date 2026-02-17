import { buildToolNudge, alreadyFired, systemNudge, type Nudger, type NudgeBlock } from "../nudge-tools"
import type { DerivedOrientation, Finding, Files } from "../../derived"
import { derive, hasActiveOrientation, actionsSinceOrientationChange } from "../../derived"

const STUCK_LIMIT = 30
const INSTRUCTIONS_MARKER = "[orientation-instructions]"

const formatFinding = (finding: Finding, index: number): string => {
  const internalPart = finding.internal ? ` [context: ${finding.internal}]` : ""
  return `${index + 1}. [${finding.direction}] → "${finding.learned}"${internalPart}`
}

const formatState = (orientation: DerivedOrientation): string => {
  const direction = orientation.currentDirection
    ? `\nCurrent direction: ${orientation.currentDirection}`
    : ""

  const findings = orientation.findings.length > 0
    ? `\n\nFindings so far:\n${orientation.findings.map(formatFinding).join("\n")}`
    : ""

  return `ORIENTING: ${orientation.question}${direction}${findings}`
}

const instructions = `${INSTRUCTIONS_MARKER}
Investigate the current direction using tools, then call reorient with what you learned and your decision (continue / answer / plan).
Do NOT answer directly — use decision "answer" to exit orientation first.`

const buildOrientationStateNudge = (orientation: DerivedOrientation, includeInstructions: boolean): NudgeBlock =>
  systemNudge(includeInstructions ? `${formatState(orientation)}\n\n${instructions}` : formatState(orientation))

const buildOrientationStuckNudge = (orientation: DerivedOrientation): NudgeBlock =>
  systemNudge(`STUCK ORIENTING: ${orientation.question}

You MUST now call reorient with decision "answer" or "plan" to exit.
If you cannot answer, call abort.`)

export const createOrientationNudge = (getFiles: () => Files): Nudger => (history) => {
  const d = derive(history, getFiles())
  if (!hasActiveOrientation(d.orientation)) return null

  const actions = actionsSinceOrientationChange(history)
  if (actions > STUCK_LIMIT) return null
  if (actions === STUCK_LIMIT) return buildOrientationStuckNudge(d.orientation!)

  const needsInstructions = !alreadyFired(history, INSTRUCTIONS_MARKER)
  return buildOrientationStateNudge(d.orientation!, needsInstructions)
}

export const orientationStartNudge = buildToolNudge(
  "orientate",
  `Each step must yield insight, not just activity.`
)
