import type { Plan, Step } from "~/lib/agent"
import type { ToolCall } from "~/lib/llm"

export type ParsedResponse =
  | { type: "text"; content: string }
  | { type: "task"; task: string }
  | { type: "plan"; plan: Plan }
  | { type: "step_complete"; summary: string }
  | { type: "stuck"; question: string }
  | { type: "tool_call"; name: string; id: string; args: unknown }

const extractJSON = (content: string): unknown | null => {
  try {
    const match = content.match(/```json\n?([\s\S]*?)\n?```/)
    if (match) {
      return JSON.parse(match[1])
    }
  } catch {
    // Not valid JSON
  }
  return null
}

export const parseResponse = (content: string, toolCalls?: ToolCall[]): ParsedResponse => {
  if (toolCalls?.length) {
    const tc = toolCalls[0]
    let args: unknown = {}
    try {
      args = JSON.parse(tc.function.arguments)
    } catch {
      // Keep empty args
    }
    return { type: "tool_call", name: tc.function.name, id: tc.id, args }
  }

  const json = extractJSON(content) as Record<string, unknown> | null
  if (json?.type === "step_complete") {
    return { type: "step_complete", summary: String(json.summary ?? "") }
  }
  if (json?.type === "stuck") {
    return { type: "stuck", question: String(json.question ?? "What should I do?") }
  }
  if (json?.type === "task") {
    return { type: "task", task: String(json.task ?? json.description ?? "") }
  }
  if (json?.type === "plan" || json?.steps) {
    const plan = parsePlanFromJSON(json)
    if (plan) return { type: "plan", plan }
  }

  return { type: "text", content }
}

const parsePlanFromJSON = (json: Record<string, unknown>): Plan | null => {
  const steps = json.steps
  if (!Array.isArray(steps)) return null

  return {
    task: String(json.task ?? "Task"),
    steps: steps.map((s, i): Step => ({
      id: String(i + 1),
      description: typeof s === "string" ? s : String((s as Record<string, unknown>).description ?? ""),
      status: "pending",
    })),
  }
}

export const parsePlan = (content: string): Plan | null => {
  const json = extractJSON(content) as Record<string, unknown> | null
  if (json) {
    const plan = parsePlanFromJSON(json)
    if (plan) return plan
  }

  const lines = content.split("\n").filter((l) => /^\d+\./.test(l.trim()))
  if (lines.length > 0) {
    return {
      task: "Task",
      steps: lines.map((line, i): Step => ({
        id: String(i + 1),
        description: line.replace(/^\d+\.\s*/, "").trim(),
        status: "pending",
      })),
    }
  }

  return null
}
