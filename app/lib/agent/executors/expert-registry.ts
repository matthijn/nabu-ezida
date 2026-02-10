import type { ToolDefinition } from "./tool"

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

export type TaskDef = {
  description: string
  tools?: ToolDefinition[]
  call: (args: CallArgs) => Promise<CallResult>
}

export type ExpertDef = {
  description: string
  talk?: boolean
  tasks: Record<string, TaskDef>
}

export type ExpertRegistry = Record<string, ExpertDef>

let registry: ExpertRegistry = {}

export const setExperts = (experts: ExpertRegistry): void => {
  registry = experts
}

export const getExperts = (): ExpertRegistry => registry

export const getExpertNames = (): string[] =>
  Object.keys(registry)

export const getAllTaskNames = (): string[] =>
  [...new Set(Object.values(registry).flatMap((e) => Object.keys(e.tasks)))]

export const generateExpertDocs = (): string => {
  const lines: string[] = ["Experts & tasks:"]
  for (const [name, def] of Object.entries(registry)) {
    lines.push(`- ${name}: ${def.description}`)
    for (const [taskName, taskDef] of Object.entries(def.tasks)) {
      lines.push(`  - ${taskName}: ${taskDef.description}`)
    }
  }
  return lines.join("\n")
}

export const getExpertTask = (expert: string, task?: string): { error?: string; taskDef?: TaskDef } => {
  const expertDef = registry[expert]
  if (!expertDef) {
    return { error: `Unknown expert: ${expert}. Available: ${getExpertNames().join(", ")}` }
  }
  if (!task) return {}
  const taskDef = expertDef.tasks[task]
  if (!taskDef) {
    const available = Object.keys(expertDef.tasks).join(", ")
    return { error: `Expert '${expert}' cannot do task '${task}'. Available tasks: ${available}` }
  }
  return { taskDef }
}

export const getTaskTools = (expert: string, task?: string): ToolDefinition[] | null =>
  registry[expert]?.tasks[task ?? ""]?.tools ?? null
