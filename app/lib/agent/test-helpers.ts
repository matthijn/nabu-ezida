import type { Block } from "./types"

export const createPlanCall = (task: string, steps: string[]): Block => ({
  type: "tool_call",
  calls: [{ id: "1", name: "create_plan", args: { task, steps } }],
})

export const completeStepCall = (summary = "Done"): Block => ({
  type: "tool_call",
  calls: [{ id: "1", name: "complete_step", args: { summary } }],
})

export const abortCall = (message = "Stopping"): Block => ({
  type: "tool_call",
  calls: [{ id: "1", name: "abort", args: { message } }],
})

export const startExplorationCall = (question: string, direction?: string): Block => ({
  type: "tool_call",
  calls: [{ id: "1", name: "start_exploration", args: { question, direction } }],
})

export const explorationStepCall = (learned: string, decision: string, next?: string): Block => ({
  type: "tool_call",
  calls: [{ id: "1", name: "exploration_step", args: { learned, decision, next } }],
})

export const toolResult = (callId = "1", result: unknown = { ok: true }): Block => ({
  type: "tool_result",
  callId,
  result,
})

export const askCall = (question = "What should I do?"): Block => ({
  type: "tool_call",
  calls: [{ id: "1", name: "ask", args: { question } }],
})

export const userBlock = (content: string): Block => ({
  type: "user",
  content,
})
