// Orchestration tools are signals for the nudge system in orchestrator.ts
// They return synthetic ok - actual logic lives in the reducer

import type { Handler } from "../types"

const syntheticOk: Handler = async () => ({ ok: true })

export const createPlan = syntheticOk
export const completeStep = syntheticOk
export const abort = syntheticOk
export const ask = syntheticOk
export const startExploration = syntheticOk
export const explorationStep = syntheticOk
