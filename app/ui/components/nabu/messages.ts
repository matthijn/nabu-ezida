import type { Block, ToolCall } from "~/lib/agent/client"
import type { FileStore } from "~/lib/files"
import { derive, findCall, type DerivedPlan } from "~/lib/agent"
import { AskArgs, type AskScope } from "~/lib/agent/tools/ask/def"
import { ScoutArgs } from "~/lib/agent/tools/scout/def"

export interface TextMessage {
  type: "text"
  role: "user" | "assistant"
  content: string
  draft?: true
}

export interface PlanMessage {
  type: "plan"
  plan: DerivedPlan
  currentStep: number | null
  aborted: boolean
}

export type RenderMessage = TextMessage | PlanMessage

export interface Indexed<T> {
  index: number
  message: T
}

const hasContent = (s: string): boolean => s.trim().length > 0

const isContentBlock = (b: Block): b is { type: "user" | "text" | "error"; content: string } =>
  b.type === "user" || b.type === "text" || b.type === "error"

const hasDraft = (b: Block): boolean => "draft" in b && b.draft === true

export const textMessagesIndexed = (history: Block[]): Indexed<TextMessage>[] =>
  history
    .map((b, i) => ({ block: b, index: i }))
    .filter(
      (
        item
      ): item is { block: { type: "user" | "text" | "error"; content: string }; index: number } =>
        isContentBlock(item.block) && hasContent(item.block.content)
    )
    .map(({ block, index }) => ({
      index,
      message: {
        type: "text" as const,
        role: block.type === "user" ? "user" : "assistant",
        content: block.content,
        ...(hasDraft(history[index]) && { draft: true as const }),
      },
    }))

export const findCreationIndices = (history: Block[], toolName: string): number[] =>
  history
    .map((b, i) => ({ block: b, index: i }))
    .filter(({ block }) => findCall(block, toolName) !== undefined)
    .map(({ index }) => index)

const planMessagesIndexed = (history: Block[], plans: DerivedPlan[]): Indexed<PlanMessage>[] => {
  const indices = findCreationIndices(history, "submit_plan")
  return plans.map((plan, i) => ({
    index: indices[i] ?? 0,
    message: { type: "plan", plan, currentStep: plan.currentStep, aborted: plan.aborted },
  }))
}

export const byIndex = <T>(a: Indexed<T>, b: Indexed<T>): number => a.index - b.index

export const toRenderMessages = (history: Block[], files: FileStore = {}): RenderMessage[] => {
  const d = derive(history, files)
  const indexed: Indexed<RenderMessage>[] = [
    ...textMessagesIndexed(history),
    ...planMessagesIndexed(history, d.plans),
  ]
  return indexed.sort(byIndex).map((item) => item.message)
}

export type { AskScope }

export interface AskMessage {
  type: "ask"
  question: string
  options: string[]
  selected: string | null
  scope: AskScope
}

interface AskExtraction {
  messages: Indexed<AskMessage>[]
  consumedUserIndices: Set<number>
}

const findAskCalls = (history: Block[]): { index: number; call: ToolCall }[] =>
  history.flatMap((block, index) => {
    const call = findCall(block, "ask")
    return call ? [{ index, call }] : []
  })

const findToolResult = (history: Block[], callId: string): string | null => {
  for (const block of history) {
    if (block.type === "tool_result" && block.callId === callId) {
      const result = block.result as { output?: string } | undefined
      return result?.output ?? null
    }
  }
  return null
}

const findConsumedUserIndices = (history: Block[], askIndex: number, callId: string): number[] => {
  const indices: number[] = []
  for (let i = askIndex + 1; i < history.length; i++) {
    const block = history[i]
    if (block.type === "tool_result" && block.callId === callId) break
    if (block.type === "user") indices.push(i)
  }
  return indices
}

interface ParsedAskArgs {
  question: string
  options: string[]
  scope: AskScope
}

const parseAskArgs = (args: Record<string, unknown>): ParsedAskArgs | null => {
  const parsed = AskArgs.safeParse(args)
  if (!parsed.success) return null
  return {
    question: parsed.data.question,
    options: parsed.data.options ?? [],
    scope: parsed.data.scope,
  }
}

const extractSingleAsk = (
  index: number,
  call: ToolCall,
  history: Block[],
  consumed: Set<number>
): Indexed<AskMessage>[] => {
  const args = parseAskArgs(call.args)
  if (!args) return []

  const userIndices = findConsumedUserIndices(history, index, call.id)
  userIndices.forEach((i) => consumed.add(i))

  const resultOutput = findToolResult(history, call.id)
  const userAnswer =
    userIndices.length > 0 ? (history[userIndices[0]] as { content: string }).content : null
  const selected = resultOutput ?? userAnswer

  return [
    {
      index,
      message: {
        type: "ask" as const,
        question: args.question,
        options: args.options,
        selected,
        scope: args.scope,
      },
    },
  ]
}

export const extractAskMessages = (history: Block[]): AskExtraction => {
  const consumed = new Set<number>()
  const messages = findAskCalls(history).flatMap(({ index, call }) =>
    extractSingleAsk(index, call, history, consumed)
  )
  return { messages, consumedUserIndices: consumed }
}

export interface ScoutFileStatus {
  path: string
  reason: string
  done: boolean
}

export interface ScoutMessage {
  type: "scout"
  task: string
  files: ScoutFileStatus[]
}

const findScoutCalls = (history: Block[]): { index: number; call: ToolCall }[] =>
  history.flatMap((block, index) => {
    const call = findCall(block, "scout")
    return call ? [{ index, call }] : []
  })

const findScoutResultIndex = (history: Block[], callId: string): number | null => {
  for (let i = 0; i < history.length; i++) {
    if (history[i].type === "tool_result" && (history[i] as { callId: string }).callId === callId)
      return i
  }
  return null
}

const collectDoneFiles = (history: Block[], from: number, to: number): Set<string> => {
  const done = new Set<string>()
  for (let i = from; i < to; i++) {
    const block = history[i]
    if (block.type !== "system") continue
    const match = block.content.match(/^File: (.+?)(?:\n|$)/)
    if (match) done.add(match[1])
  }
  return done
}

const extractSingleScout = (
  index: number,
  call: ToolCall,
  history: Block[]
): Indexed<ScoutMessage>[] => {
  const parsed = ScoutArgs.safeParse(call.args)
  if (!parsed.success) return []

  const resultIndex = findScoutResultIndex(history, call.id)
  const scanEnd = resultIndex ?? history.length
  const done = collectDoneFiles(history, index + 1, scanEnd)

  const files: ScoutFileStatus[] = parsed.data.files.map((f) => ({
    path: f.path,
    reason: f.reason,
    done: done.has(f.path),
  }))

  return [{ index, message: { type: "scout" as const, task: parsed.data.task, files } }]
}

export const extractScoutMessages = (history: Block[]): Indexed<ScoutMessage>[] =>
  findScoutCalls(history).flatMap(({ index, call }) => extractSingleScout(index, call, history))

export { isWaitingForAsk } from "~/lib/agent/client"
