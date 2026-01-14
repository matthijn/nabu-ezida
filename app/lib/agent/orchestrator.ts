import type { Block } from "./types"
import {
  derive,
  lastPlan,
  hasActiveExploration,
  hasActivePlan,
  actionsSinceStepChange,
  actionsSinceExplorationChange,
} from "./selectors"
import {
  buildPlanNudge,
  buildExplorationNudge,
  buildPlanCompletedNudge,
  buildStuckNudge,
  buildExplorationStuckNudge,
} from "./prompts"

type Nudger = (history: Block[]) => string | null

const STUCK_LIMIT = 10

const lastBlock = (history: Block[]): Block | undefined => history[history.length - 1]

const exploreNudge: Nudger = (history) => {
  const d = derive(history)
  if (!hasActiveExploration(d)) return null

  const actions = actionsSinceExplorationChange(history)
  if (actions > STUCK_LIMIT) return null
  if (actions === STUCK_LIMIT) return buildExplorationStuckNudge(d.exploration!)

  return buildExplorationNudge(d.exploration!)
}

const planNudge: Nudger = (history) => {
  const d = derive(history)
  const plan = lastPlan(d)
  if (!plan) return null

  if (hasActivePlan(d)) {
    const actions = actionsSinceStepChange(history)
    if (actions > STUCK_LIMIT) return null
    if (actions === STUCK_LIMIT) return buildStuckNudge(plan, plan.currentStep!)
    return buildPlanNudge(plan, plan.currentStep!)
  }

  if (plan.currentStep === null && !plan.aborted && lastBlock(history)?.type === "tool_result") {
    return buildPlanCompletedNudge(plan)
  }

  return null
}

const toolNudge: Nudger = (history) => {
  if (lastBlock(history)?.type !== "tool_result") return null
  const d = derive(history)
  if (hasActiveExploration(d) || lastPlan(d)) return null
  return ""
}

const userMessageNudge: Nudger = (history) => {
  if (lastBlock(history)?.type !== "user") return null
  return ""
}

const combine = (...nudgers: Nudger[]): Nudger => (history) => {
  for (const nudger of nudgers) {
    const result = nudger(history)
    if (result !== null) return result
  }
  return null
}

export const toNudge = combine(exploreNudge, planNudge, toolNudge, userMessageNudge)
