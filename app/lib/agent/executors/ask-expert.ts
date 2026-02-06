import { z } from "zod"
import type { Block } from "../types"
import type { AgentNudge } from "../loop"
import { runAgent, noNudge } from "../loop"
import type { ToolDefinition } from "./tool"
import { tool, registerTool, ok, err, getToolHandlers } from "./tool"
import { buildCaller } from "../caller"
import { extractText } from "../stream"
import { createShell } from "./shell/shell"
import { createExecutor } from "./execute"
import { expertToolDefinitions, reviseCodebookToolDefinitions } from "./expert-tools"

export type ExpertSummary = { orchestrator_summary: string; display_summary: string }

type TaskDef = {
  description: string
  tools?: ToolDefinition[]
  call: (args: CallArgs) => Promise<CallResult>
}

type ExpertDef = {
  description: string
  tasks: Record<string, TaskDef>
}

type CallArgs = {
  expert: string
  task: string | null
  context: string
  content: string
}

type CallResult =
  | { result: string }
  | { error: string }

const buildMessages = (context: string, content: string): Block[] => [
  { type: "system", content: context },
  { type: "user", content },
]

const buildEndpoint = (expert: string, task?: string): string =>
  task ? `/ask-expert/${expert}/${task}` : `/ask-expert/${expert}`

const buildCallerName = (expert: string, task: string | null): string =>
  task ? `${expert}/${task}` : expert

const CONTINUE_MARKER = "Continue your analysis. When finished, call summarize_expertise."

const CONTINUE_BLOCK: Block = { type: "system", content: CONTINUE_MARKER }

const MAX_EXPERT_TURNS = 10

const findSummarizeResult = (history: Block[]): ExpertSummary | null => {
  for (let i = history.length - 1; i >= 0; i--) {
    const block = history[i]
    if (block.type === "tool_result" && (block as { toolName?: string }).toolName === "summarize_expertise") {
      const result = (block as { result: unknown }).result as { output?: unknown; status?: string }
      if (result?.status === "ok" && result.output) {
        return result.output as ExpertSummary
      }
    }
  }
  return null
}

const countContinueNudges = (history: Block[]): number =>
  history.filter((b) => b.type === "system" && b.content === CONTINUE_MARKER).length

const expertToolNudge: AgentNudge = async (history) => {
  if (findSummarizeResult(history)) return []
  if (countContinueNudges(history) >= MAX_EXPERT_TURNS - 1) return []
  return [CONTINUE_BLOCK]
}

export const runExpertWithTools = async (expert: string, task: string | null, messages: Block[], tools: ToolDefinition[]): Promise<ExpertSummary> => {
  const executor = createExecutor(getToolHandlers())
  const caller = buildCaller(buildCallerName(expert, task), {
    endpoint: buildEndpoint(expert, task ?? undefined),
    tools,
    execute: executor,
  })

  const history = await runAgent(caller, expertToolNudge, messages)
  const summary = findSummarizeResult(history)
  if (!summary) throw new Error("Expert did not call summarize_expertise")
  return summary
}

export const runExpertFreeform = async (expert: string, task: string | null, messages: Block[]): Promise<string> => {
  const caller = buildCaller(buildCallerName(expert, task), {
    endpoint: buildEndpoint(expert, task ?? undefined),
  })
  const history = await runAgent(caller, noNudge, messages)
  return extractText(history.slice(messages.length))
}

const callWithToolDefs = (tools: ToolDefinition[]): TaskDef["call"] =>
  async ({ expert, task, context, content }) => {
    try {
      const summary = await runExpertWithTools(expert, task, buildMessages(context, content), tools)
      return { result: summary.display_summary }
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) }
    }
  }

const callFreeform: TaskDef["call"] = async ({ expert, task, context, content }) => {
  try {
    return { result: await runExpertFreeform(expert, task, buildMessages(context, content)) }
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

const experts: Record<string, ExpertDef> = {
  "qualitative-researcher": {
    description: "Qualitative analysis specialist",
    tasks: {
      "apply-codebook": {
        description: "Apply codebook codes to content (uses annotation tools)",
        tools: expertToolDefinitions,
        call: callWithToolDefs(expertToolDefinitions),
      },
      "revise-codebook": {
        description: "Revise codebook based on locally resolved codings (uses patch tools)",
        tools: reviseCodebookToolDefinitions,
        call: callWithToolDefs(reviseCodebookToolDefinitions),
      },
    },
  },
  "analyst": {
    description: "Rigorous analytical reader—evaluates arguments, surfaces assumptions, applies frameworks to content",
    tasks: {},
  },
}

const expertNames = Object.keys(experts) as [string, ...string[]]
const ExpertEnum = z.enum(expertNames)

const allTasks = [...new Set(Object.values(experts).flatMap((e) => Object.keys(e.tasks)))] as [string, ...string[]]
const TaskEnum = z.enum(allTasks)

const generateExpertDocs = (): string => {
  const lines: string[] = ["Experts & tasks:"]
  for (const [name, def] of Object.entries(experts)) {
    lines.push(`- ${name}: ${def.description}`)
    for (const [taskName, taskDef] of Object.entries(def.tasks)) {
      lines.push(`  - ${taskName}: ${taskDef.description}`)
    }
  }
  return lines.join("\n")
}

const getExpertTask = (expert: string, task?: string): { error?: string; taskDef?: TaskDef } => {
  const expertDef = experts[expert]
  if (!expertDef) {
    return { error: `Unknown expert: ${expert}. Available: ${expertNames.join(", ")}` }
  }
  if (!task) return {}
  const taskDef = expertDef.tasks[task]
  if (!taskDef) {
    const available = Object.keys(expertDef.tasks).join(", ")
    return { error: `Expert '${expert}' cannot do task '${task}'. Available tasks: ${available}` }
  }
  return { taskDef }
}

const resolveShellCommand = (files: Map<string, string>, command: string): { output?: string; error?: string } => {
  const shell = createShell(files)
  const result = shell.exec(command)
  if (result.isError) return { error: result.output }
  return { output: result.output }
}

const AskExpertArgs = z.object({
  expert: ExpertEnum.describe("Specialist type"),
  task: TaskEnum.optional().describe("Specific task (omit for freeform response)"),
  using: z.string().min(1).describe("Shell command to get framework/context"),
  about: z.string().min(1).describe("Shell command to get content to analyze"),
})

export const askExpert = registerTool(
  tool({
    name: "ask_expert",
    description: `Ask a specialist expert to analyze content.

Args:
- expert: The type of specialist
- task: Specific task (optional - omit for freeform response)
- using: Shell command to get framework/context (e.g., "cat Codebook.md")
- about: Shell command to get content to analyze (e.g., "cat doc.md | head -n 100")

${generateExpertDocs()}`,
    schema: AskExpertArgs,
    handler: async (files, { expert, task, using, about }) => {
      const { error: validationError, taskDef } = getExpertTask(expert, task)
      if (validationError) return err(validationError)

      const contextResult = resolveShellCommand(files, using)
      if (contextResult.error) return err(`using: ${contextResult.error}`)

      const contentResult = resolveShellCommand(files, about)
      if (contentResult.error) return err(`about: ${contentResult.error}`)

      const callFn = taskDef?.call ?? callFreeform
      const callResult = await callFn({
        expert,
        task: task ?? null,
        context: contextResult.output!,
        content: contentResult.output!,
      })

      if ("error" in callResult) return err(callResult.error)
      return ok(callResult.result)
    },
  })
)

const getTaskTools = (expert: string, task?: string): ToolDefinition[] | null =>
  experts[expert]?.tasks[task ?? ""]?.tools ?? null

export { experts, generateExpertDocs, getExpertTask, getTaskTools }
