import { z } from "zod"
import type { Block, BlockOrigin } from "../types"
import { createInstance } from "../types"
import type { AgentNudge } from "../loop"
import { runAgent, noNudge } from "../loop"
import type { ToolDefinition } from "./tool"
import { tool, registerTool, ok, err, getToolHandlers, toToolDefinition } from "./tool"
import { buildCaller } from "../caller"
import { extractText } from "../stream"
import { getStreamingCallbacks, getCallerOrigin, withStreamingReset } from "../streaming-context"
import { pushBlocks, tagBlocks, retagBlocks, getBlocksForInstance, findLastSuccessfulCalls, type TaggedBlock } from "../block-store"
import { createToNudge, type MultiNudger } from "../steering"
import { getFiles } from "~/lib/files"
import { createShell } from "./shell/shell"
import { createExecutor } from "./execute"
import { expertToolDefinitions, reviseCodebookToolDefinitions, summarizeExpertise } from "./expert-tools"
import { createPlan, orientate, reorient } from "./orchestration"
import { runLocalShell } from "./shell/tool"
import { isAbortError } from "~/lib/utils"

export type ExpertSummary = { orchestrator_summary: string }

type TaskDef = {
  description: string
  tools?: ToolDefinition[]
  call: (args: CallArgs) => Promise<CallResult>
}

type ExpertDef = {
  description: string
  talk?: boolean
  tasks: Record<string, TaskDef>
}

type CallArgs = {
  expert: string
  task: string | null
  context: string
  content: string
  instructions?: string
  contentType?: ContentBlockType
}

type CallResult =
  | { result: string }
  | { error: string }

const appendInstructions = (content: string, instructions?: string): string =>
  instructions ? `${content}\n\n<instructions>\n${instructions}\n</instructions>` : content

type ContentBlockType = "user" | "system"

const buildMessages = (context: string, content: string, instructions?: string, contentType: ContentBlockType = "user"): Block[] => [
  { type: "system", content: context },
  { type: contentType, content: appendInstructions(content, instructions) },
]

const buildEndpoint = (expert: string, task?: string): string =>
  task ? `/ask-expert/${expert}/${task}` : `/ask-expert/${expert}`

const buildExpertOrigin = (expert: string, task: string | null): BlockOrigin => {
  const agent = task ? `${expert}/${task}` : expert
  return { agent, instance: createInstance(agent) }
}

const CONTINUE_MARKER = "Have you completed your objective? If not, continue working. If yes, call summarize_expertise."

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

const buildGatedExpertNudge = (inner: MultiNudger): AgentNudge => async (history) => {
  if (findSummarizeResult(history)) return []
  if (countContinueNudges(history) >= MAX_EXPERT_TURNS - 1) return []
  const nudges = await inner(history)
  return nudges.length > 0 ? nudges : [CONTINUE_BLOCK]
}

const readBlocksFor = (instance: string) => (): Block[] =>
  getBlocksForInstance(instance)

export type ExpertRunResult = { summary: ExpertSummary; origin: BlockOrigin }

export const runExpertWithTools = async (expert: string, task: string | null, messages: Block[], tools: ToolDefinition[]): Promise<ExpertSummary> => {
  const { summary } = await runExpertWithToolsTracked(expert, task, messages, tools)
  return summary
}

const runExpertWithToolsTracked = async (expert: string, task: string | null, messages: Block[], tools: ToolDefinition[]): Promise<ExpertRunResult> => {
  const executor = createExecutor(getToolHandlers())
  const origin = buildExpertOrigin(expert, task)

  pushBlocks(tagBlocks(origin, messages))

  const readBlocks = readBlocksFor(origin.instance)
  const caller = withStreamingReset(buildCaller(origin, {
    endpoint: buildEndpoint(expert, task ?? undefined),
    tools,
    execute: executor,
    callbacks: getStreamingCallbacks(),
    readBlocks,
  }))

  const expertDef = experts[expert]
  const talk = expertDef?.talk ?? false
  const toNudge = createToNudge(tools, talk, getFiles)
  const gatedNudge = buildGatedExpertNudge(toNudge)
  await runAgent(origin, caller, gatedNudge, readBlocks)
  const summary = findSummarizeResult(readBlocks())
  if (!summary) throw new Error("Expert did not call summarize_expertise")
  return { summary, origin }
}

export const runExpertFreeform = async (expert: string, task: string | null, messages: Block[]): Promise<string> => {
  const origin = buildExpertOrigin(expert, task)

  pushBlocks(tagBlocks(origin, messages))

  const readBlocks = readBlocksFor(origin.instance)
  const caller = withStreamingReset(buildCaller(origin, {
    endpoint: buildEndpoint(expert, task ?? undefined),
    callbacks: getStreamingCallbacks(),
    readBlocks,
  }))

  await runAgent(origin, caller, noNudge, readBlocks)
  const allBlocks = readBlocks()
  return extractText(allBlocks.slice(messages.length))
}

const callWithToolDefs = (tools: ToolDefinition[]): TaskDef["call"] =>
  async ({ expert, task, context, content, instructions, contentType }) => {
    try {
      const summary = await runExpertWithTools(expert, task, buildMessages(context, content, instructions, contentType), tools)
      return { result: summary.orchestrator_summary }
    } catch (e) {
      if (isAbortError(e)) throw e
      return { error: e instanceof Error ? e.message : String(e) }
    }
  }

const callFreeform: TaskDef["call"] = async ({ expert, task, context, content, instructions, contentType }) => {
  try {
    return { result: await runExpertFreeform(expert, task, buildMessages(context, content, instructions, contentType)) }
  } catch (e) {
    if (isAbortError(e)) throw e
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

const plannerToolDefinitions: ToolDefinition[] = [
  toToolDefinition(runLocalShell),
  toToolDefinition(orientate),
  toToolDefinition(reorient),
  toToolDefinition(createPlan),
  toToolDefinition(summarizeExpertise),
]

const callWithProxy = (proxyToolNames: string[], tools: ToolDefinition[]): TaskDef["call"] =>
  async (args) => {
    try {
      const messages = buildMessages(args.context, args.content, args.instructions, args.contentType)
      const { summary, origin } = await runExpertWithToolsTracked(args.expert, args.task, messages, tools)
      const expertBlocks = getBlocksForInstance(origin.instance) as TaggedBlock[]
      const proxied = findLastSuccessfulCalls(expertBlocks, proxyToolNames)
      const callerOrigin = getCallerOrigin()
      if (proxied.length > 0 && callerOrigin) {
        pushBlocks(retagBlocks(proxied, callerOrigin))
      }
      return { result: summary.orchestrator_summary }
    } catch (e) {
      if (isAbortError(e)) throw e
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
  "planner": {
    description: "Plans multi-step tasks given intent and constraints",
    tasks: {
      "plan": {
        description: "Create execution plan",
        tools: plannerToolDefinitions,
        call: callWithProxy(["create_plan"], plannerToolDefinitions),
      },
    },
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
  instructions: z.string().optional().describe("Extra guidance for the expert (e.g., focus areas, constraints)"),
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
    handler: async (files, { expert, task, using, about, instructions }) => {
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
        instructions,
      })

      if ("error" in callResult) return err(callResult.error)
      return ok(callResult.result)
    },
  })
)

const DelegatePlanArgs = z.object({
  intent: z.string().min(1).describe("What the user wants to accomplish"),
  outcome: z.string().min(1).describe("What success looks like"),
  context: z.string().min(1).describe("Shell command to get relevant context"),
  involvement: z.string().min(1).describe("How deeply should the plan involve the user"),
  constraints: z.string().min(1).describe("Boundaries, limitations, or requirements"),
})

export const delegatePlan = registerTool(
  tool({
    name: "delegate_plan",
    description: `Delegate plan creation to the planner expert.

The planner will orient, investigate, and create_plan. The resulting plan will appear in your context automatically.`,
    schema: DelegatePlanArgs,
    handler: async (files, { intent, outcome, context: ctxCmd, involvement, constraints }) => {
      const contextResult = resolveShellCommand(files, ctxCmd)
      if (contextResult.error) return err(`context: ${contextResult.error}`)

      const content = [
        `Intent: ${intent}`,
        `Desired outcome: ${outcome}`,
        `User involvement: ${involvement}`,
        `Constraints: ${constraints}`,
      ].join("\n")

      const callFn = experts["planner"].tasks["plan"].call
      const callResult = await callFn({
        expert: "planner",
        task: "plan",
        context: contextResult.output!,
        content,
        contentType: "system",
      })

      if ("error" in callResult) return err(callResult.error)
      return ok(callResult.result)
    },
  })
)

const getTaskTools = (expert: string, task?: string): ToolDefinition[] | null =>
  experts[expert]?.tasks[task ?? ""]?.tools ?? null

export { experts, generateExpertDocs, getExpertTask, getTaskTools, appendInstructions }
