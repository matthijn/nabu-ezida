import type { Plan, Step } from "~/lib/agent"
import type { ToolCall } from "~/lib/llm"

export type ParsedResponse =
  | { type: "text"; content: string }
  | { type: "task"; task: string }
  | { type: "plan"; plan: Plan }
  | { type: "step_complete"; summary: string }
  | { type: "stuck"; question: string }
  | { type: "tool_call"; name: string; id: string; args: unknown }
  | { type: "parse_error"; message: string }

const extractJSON = (content: string): unknown | null => {
  try {
    const match = content.match(/```json\n?([\s\S]*?)\n?```/)
    if (match) {
      return JSON.parse(match[1])
    }
  } catch {
    // Not valid JSON in code block
  }

  const trimmed = content.trim()
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      return JSON.parse(trimmed)
    } catch {
      // Not valid raw JSON
    }
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
    if (typeof json.description !== "string") {
      throw new Error("task requires description field")
    }
    return { type: "task", task: json.description }
  }
  if (json?.type === "plan") {
    const plan = parsePlanFromJSON(json)
    return { type: "plan", plan }
  }

  return { type: "text", content }
}

export const tryParseResponse = (content: string, toolCalls?: ToolCall[]): ParsedResponse => {
  try {
    return parseResponse(content, toolCalls)
  } catch (err) {
    return { type: "parse_error", message: err instanceof Error ? err.message : "Invalid format" }
  }
}

const parsePlanFromJSON = (json: Record<string, unknown>): Plan => {
  if (typeof json.task !== "string") {
    throw new Error("plan requires task field")
  }
  if (!Array.isArray(json.steps)) {
    throw new Error("plan requires steps array")
  }

  return {
    task: json.task,
    steps: json.steps.map((s, i): Step => {
      const step = s as Record<string, unknown>
      if (typeof step.description !== "string") {
        throw new Error(`step ${i} requires description field`)
      }
      return {
        id: String(i + 1),
        description: step.description,
        status: "pending",
      }
    }),
  }
}

