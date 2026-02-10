import type { ToolDefinition } from "./tool"
import { toToolDefinition } from "./tool"
import { experts, type ExpertConfig, type TaskConfig } from "./agents"
export type { TaskConfig } from "./agents"

export type ContentBlockType = "user" | "system"

export type CallArgs = {
  expert: string
  task: string | null
  context: string
  content: string
  instructions?: string
  contentType?: ContentBlockType
}

export type CallResult =
  | { result: string }
  | { error: string }

export const getExperts = (): Record<string, ExpertConfig> => experts

export const getExpertNames = (): string[] =>
  Object.keys(experts)

export const getAllTaskNames = (): string[] =>
  [...new Set(Object.values(experts).flatMap((e) => Object.keys(e.tasks)))]

export const generateExpertDocs = (): string => {
  const lines: string[] = ["Experts & tasks:"]
  for (const [name, def] of Object.entries(experts)) {
    lines.push(`- ${name}: ${def.description}`)
    for (const [taskName, taskConfig] of Object.entries(def.tasks)) {
      lines.push(`  - ${taskName}: ${taskConfig.description}`)
    }
  }
  return lines.join("\n")
}

export const getExpertTask = (expert: string, task?: string): { error?: string; taskConfig?: TaskConfig } => {
  const expertDef = experts[expert]
  if (!expertDef) {
    return { error: `Unknown expert: ${expert}. Available: ${getExpertNames().join(", ")}` }
  }
  if (!task) return {}
  const taskConfig = expertDef.tasks[task]
  if (!taskConfig) {
    const available = Object.keys(expertDef.tasks).join(", ")
    return { error: `Expert '${expert}' cannot do task '${task}'. Available tasks: ${available}` }
  }
  return { taskConfig }
}

export const getTaskTools = (expert: string, task?: string): ToolDefinition[] | null =>
  experts[expert]?.tasks[task ?? ""]?.tools.map(toToolDefinition) ?? null
