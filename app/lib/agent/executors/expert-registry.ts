import type { ToolDefinition } from "./tool"
import { toToolDefinition } from "./tool"
import { agents, type AgentDef } from "./agents"

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

const isExpertAgent = (key: string): boolean => key !== "orchestrator"

const expertEntries = (): [string, AgentDef][] =>
  Object.entries(agents).filter(([k]) => isExpertAgent(k))

const splitKey = (key: string): { expert: string; task: string | null } => {
  const slash = key.indexOf("/")
  return slash === -1
    ? { expert: key, task: null }
    : { expert: key.slice(0, slash), task: key.slice(slash + 1) }
}

const toAgentKey = (expert: string, task: string | null): string =>
  task ? `${expert}/${task}` : expert

export const getExpertNames = (): string[] =>
  [...new Set(expertEntries().map(([k]) => splitKey(k).expert))]

export const getAllTaskNames = (): string[] =>
  expertEntries()
    .map(([k]) => splitKey(k).task)
    .filter((t): t is string => t !== null)

export const generateExpertDocs = (): string => {
  const grouped = new Map<string, { description: string; tasks: { name: string; description: string }[] }>()

  for (const [key, def] of expertEntries()) {
    const { expert, task } = splitKey(key)
    if (!grouped.has(expert)) {
      grouped.set(expert, { description: task ? expert : def.description, tasks: [] })
    }
    if (task) {
      grouped.get(expert)!.tasks.push({ name: task, description: def.description })
    }
  }

  const lines: string[] = ["Experts & tasks:"]
  for (const [name, { description, tasks }] of grouped) {
    lines.push(tasks.length > 0 ? `- ${name}:` : `- ${name}: ${description}`)
    for (const t of tasks) {
      lines.push(`  - ${t.name}: ${t.description}`)
    }
  }
  return lines.join("\n")
}

export const getAgentDef = (expert: string, task: string | null): AgentDef | null =>
  agents[toAgentKey(expert, task)] ?? null

export const validateExpertCall = (expert: string, task?: string): { error?: string; agentDef?: AgentDef } => {
  const names = getExpertNames()
  if (!names.includes(expert)) {
    return { error: `Unknown expert: ${expert}. Available: ${names.join(", ")}` }
  }
  const def = getAgentDef(expert, task ?? null)
  if (!def) {
    const tasks = getAllTaskNames()
    return { error: `Expert '${expert}' cannot do task '${task}'. Available tasks: ${tasks.join(", ")}` }
  }
  return { agentDef: def }
}

export const getAgentTools = (expert: string, task: string | null): ToolDefinition[] | null => {
  const def = getAgentDef(expert, task)
  if (!def || def.tools.length === 0) return null
  return def.tools.map(toToolDefinition)
}
