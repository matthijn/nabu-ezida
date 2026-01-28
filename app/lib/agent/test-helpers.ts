import type { Block } from "./types"
import type { StepDef, StepDefObject } from "./selectors"

// Helper to convert string steps to object steps for backward compatibility in tests
type StepInput = string | StepDefObject | { per_section: (string | StepDefObject)[] }

const toStepDef = (input: StepInput): StepDef => {
  if (typeof input === "string") {
    return { title: input, expected: `${input} done` }
  }
  if ("per_section" in input) {
    return {
      per_section: input.per_section.map((s) =>
        typeof s === "string" ? { title: s, expected: `${s} done` } : s
      ),
    }
  }
  return input
}

export const createPlanCall = (task: string, steps: StepInput[], files?: string[]): Block => ({
  type: "tool_call",
  calls: [{ id: "1", name: "create_plan", args: { task, steps: steps.map(toStepDef), files } }],
})

export const completeStepCall = (summary = "Done", internal?: string): Block => ({
  type: "tool_call",
  calls: [{ id: "1", name: "complete_step", args: { summary, internal } }],
})

export const abortCall = (message = "Stopping"): Block => ({
  type: "tool_call",
  calls: [{ id: "1", name: "abort", args: { message } }],
})

export const startExplorationCall = (question: string, direction?: string): Block => ({
  type: "tool_call",
  calls: [{ id: "1", name: "start_exploration", args: { question, direction } }],
})

export const explorationStepCall = (internal: string, learned: string, decision: string, next?: string): Block => ({
  type: "tool_call",
  calls: [{ id: "1", name: "exploration_step", args: { internal, learned, decision, next } }],
})

export const toolResult = (callId = "1", result: unknown = { ok: true }): Block => ({
  type: "tool_result",
  callId,
  result,
})

export const userBlock = (content: string): Block => ({
  type: "user",
  content,
})
