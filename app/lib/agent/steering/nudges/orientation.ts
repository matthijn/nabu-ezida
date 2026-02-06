import { buildToolNudge, systemNudge, type Nudger, type NudgeBlock } from "../nudge-tools"
import type { DerivedOrientation, Finding, Files } from "../../derived"
import { derive, hasActiveOrientation, actionsSinceOrientationChange } from "../../derived"

const STUCK_LIMIT = 30

export const createOrientationNudge = (getFiles: () => Files): Nudger => (history) => {
  const d = derive(history, getFiles())
  if (!hasActiveOrientation(d.orientation)) return null

  const actions = actionsSinceOrientationChange(history)
  if (actions > STUCK_LIMIT) return null
  if (actions === STUCK_LIMIT) return buildOrientationStuckNudge(d.orientation!)

  return buildOrientationNudge(d.orientation!)
}

const formatFinding = (finding: Finding, index: number): string => {
  const internalPart = finding.internal ? ` [context: ${finding.internal}]` : ""
  return `${index + 1}. [${finding.direction}] → "${finding.learned}"${internalPart}`
}

const buildOrientationNudge = (orientation: DerivedOrientation): NudgeBlock => {
  const hasFindings = orientation.findings.length > 0
  const direction = orientation.currentDirection
    ? `\nCurrent direction: ${orientation.currentDirection}`
    : ""

  const findings = hasFindings
    ? `\n\nFindings so far:\n${orientation.findings.map(formatFinding).join("\n")}`
    : ""

  return systemNudge(`ORIENTING: ${orientation.question}${direction}${findings}

INSTRUCTIONS:
1. Investigate the current direction using tools
2. Call reorient with:
   - learned: what you discovered (be specific)
   - decision: "continue" | "answer" | "plan"
   - next: (if continuing) your next direction

Do NOT answer directly - use decision "answer" to exit orientation first.
Each step must yield insight, not just activity.`)
}

const buildOrientationStuckNudge = (orientation: DerivedOrientation): NudgeBlock =>
  systemNudge(`STUCK ORIENTING: ${orientation.question}

You have made too many attempts without progress.

You MUST now call reorient with decision "answer" or "plan" to exit.
If you cannot answer, call abort.

No other actions are allowed. Choose one NOW.`)

export const orientationStartNudge = buildToolNudge(
  "orientate",
  `Each step must yield insight, not just activity.`
)
