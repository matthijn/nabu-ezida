import { buildToolNudge, systemNudge, type Nudger, type NudgeBlock } from "../nudge-tools"
import type { DerivedExploration, Finding } from "../../derived"
import { derive, hasActiveExploration, actionsSinceExplorationChange } from "../../derived"

const STUCK_LIMIT = 30

export const explorationNudge: Nudger = (history, files) => {
  const d = derive(history, files)
  if (!hasActiveExploration(d.exploration)) return null

  const actions = actionsSinceExplorationChange(history)
  if (actions > STUCK_LIMIT) return null
  if (actions === STUCK_LIMIT) return buildExplorationStuckNudge(d.exploration!)

  return buildExplorationNudge(d.exploration!)
}

const formatFinding = (finding: Finding, index: number): string => {
  const internalPart = finding.internal ? ` [context: ${finding.internal}]` : ""
  return `${index + 1}. [${finding.direction}] → "${finding.learned}"${internalPart}`
}

const buildExplorationNudge = (exploration: DerivedExploration): NudgeBlock => {
  const hasFindings = exploration.findings.length > 0
  const direction = exploration.currentDirection
    ? `\nCurrent direction: ${exploration.currentDirection}`
    : ""

  const findings = hasFindings
    ? `\n\nFindings so far:\n${exploration.findings.map(formatFinding).join("\n")}`
    : ""

  return systemNudge(`EXPLORING: ${exploration.question}${direction}${findings}

INSTRUCTIONS:
1. Investigate the current direction using tools
2. Call exploration_step with:
   - learned: what you discovered (be specific)
   - decision: "continue" | "answer" | "plan"
   - next: (if continuing) your next direction

Do NOT answer directly - use decision "answer" to exit exploration first.
Each step must yield insight, not just activity.`)
}

const buildExplorationStuckNudge = (exploration: DerivedExploration): NudgeBlock =>
  systemNudge(`STUCK EXPLORING: ${exploration.question}

You have made too many attempts without progress.

You MUST now call exploration_step with decision "answer" or "plan" to exit.
If you cannot answer, call abort.

No other actions are allowed. Choose one NOW.`)

export const explorationStartNudge = buildToolNudge(
  "start_exploration",
  `Each step must yield insight, not just activity.`
)
