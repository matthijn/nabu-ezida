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
import { isAbortError } from "~/lib/utils"
import { buildEndpoint, type AgentDef } from "./agents"
import {
  getExpertNames, getAllTaskNames,
  generateExpertDocs, validateExpertCall, getAgentTools, getAgentDef,
  type CallArgs, type CallResult, type ContentBlockType,
} from "./expert-registry"

export type ExpertSummary = { orchestrator_summary: string }

export const appendInstructions = (content: string, instructions?: string): string =>
  instructions ? `${content}\n\n<instructions>\n${instructions}\n</instructions>` : content

const buildMessages = (context: string, content: string, instructions?: string, contentType: ContentBlockType = "user"): Block[] => [
  { type: "system", content: context },
  { type: contentType, content: appendInstructions(content, instructions) },
]

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
  const agentDef = getAgentDef(expert, task)

  pushBlocks(tagBlocks(origin, messages))

  const readBlocks = readBlocksFor(origin.instance)
  const caller = withStreamingReset(buildCaller(origin, {
    endpoint: agentDef ? buildEndpoint(agentDef) : `/expert/${task ? `${expert}/${task}` : expert}`,
    tools,
    execute: executor,
    callbacks: getStreamingCallbacks(),
    readBlocks,
  }))

  const chat = agentDef?.chat ?? false
  const toNudge = createToNudge(tools, chat, getFiles)
  const gatedNudge = buildGatedExpertNudge(toNudge)
  await runAgent(origin, caller, gatedNudge, readBlocks)
  const summary = findSummarizeResult(readBlocks())
  if (!summary) throw new Error("Expert did not call summarize_expertise")
  return { summary, origin }
}

export const runExpertFreeform = async (expert: string, task: string | null, messages: Block[]): Promise<string> => {
  const origin = buildExpertOrigin(expert, task)
  const agentDef = getAgentDef(expert, task)

  pushBlocks(tagBlocks(origin, messages))

  const readBlocks = readBlocksFor(origin.instance)
  const caller = withStreamingReset(buildCaller(origin, {
    endpoint: agentDef ? buildEndpoint(agentDef) : `/expert/${task ? `${expert}/${task}` : expert}`,
    callbacks: getStreamingCallbacks(),
    readBlocks,
  }))

  await runAgent(origin, caller, noNudge, readBlocks)
  const allBlocks = readBlocks()
  return extractText(allBlocks.slice(messages.length))
}

const callWithToolDefs = (tools: ToolDefinition[]): ((args: CallArgs) => Promise<CallResult>) =>
  async ({ expert, task, context, content, instructions, contentType }) => {
    try {
      const summary = await runExpertWithTools(expert, task, buildMessages(context, content, instructions, contentType), tools)
      return { result: summary.orchestrator_summary }
    } catch (e) {
      if (isAbortError(e)) throw e
      return { error: e instanceof Error ? e.message : String(e) }
    }
  }

const callFreeform: (args: CallArgs) => Promise<CallResult> = async ({ expert, task, context, content, instructions, contentType }) => {
  try {
    return { result: await runExpertFreeform(expert, task, buildMessages(context, content, instructions, contentType)) }
  } catch (e) {
    if (isAbortError(e)) throw e
    return { error: e instanceof Error ? e.message : String(e) }
  }
}

const callWithProxy = (proxyToolNames: string[], tools: ToolDefinition[]): ((args: CallArgs) => Promise<CallResult>) =>
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

const resolveCall = (agentDef: AgentDef | null): ((args: CallArgs) => Promise<CallResult>) => {
  if (!agentDef || agentDef.tools.length === 0) return callFreeform
  const defs = agentDef.tools.map(toToolDefinition)
  if (agentDef.proxy) return callWithProxy(agentDef.proxy, defs)
  return callWithToolDefs(defs)
}

const resolveShellCommand = (files: Map<string, string>, command: string): { output?: string; error?: string } => {
  const shell = createShell(files)
  const result = shell.exec(command)
  if (result.isError) return { error: result.output }
  return { output: result.output }
}

const AskExpertArgs = z.object({
  expert: z.string().min(1).describe(`Specialist type. Available: ${getExpertNames().join(", ")}`),
  task: z.string().optional().describe(`Specific task. Available: ${getAllTaskNames().join(", ")}`),
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
      const { error: validationError, agentDef } = validateExpertCall(expert, task)
      if (validationError) return err(validationError)

      const contextResult = resolveShellCommand(files, using)
      if (contextResult.error) return err(`using: ${contextResult.error}`)

      const contentResult = resolveShellCommand(files, about)
      if (contentResult.error) return err(`about: ${contentResult.error}`)

      const callFn = resolveCall(agentDef ?? null)
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

export { generateExpertDocs, getAgentTools }
