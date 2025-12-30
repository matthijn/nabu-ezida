import type { Message, CompactionBlock } from "~/lib/llm"
import type { AgentState, StepResult, StepOptions, Plan, Path } from "./types"
import { parseResponse, parsePlan } from "~/lib/orchestrator/parse"

const appendUserMessage = (history: Message[], content: string): Message[] => [
  ...history,
  { role: "user", content },
]

const appendAssistantMessage = (history: Message[], content: string): Message[] => [
  ...history,
  { role: "assistant", content },
]

const appendToolResult = (history: Message[], toolCallId: string, result: unknown): Message[] => [
  ...history,
  { role: "tool", content: JSON.stringify(result), tool_call_id: toolCallId },
]

const findCurrentStepIndex = (plan: Plan): number | null => {
  const idx = plan.steps.findIndex((s) => s.status === "pending")
  return idx === -1 ? null : idx
}

const markStepDone = (plan: Plan, stepIndex: number): Plan => ({
  ...plan,
  steps: plan.steps.map((s, i) => (i === stepIndex ? { ...s, status: "done" as const } : s)),
})

const buildStepPrompt = (plan: Plan, stepIndex: number): string => {
  const step = plan.steps[stepIndex]
  const overview = plan.steps.map((s, i) => `${i + 1}. [${s.status}] ${s.description}`).join("\n")
  return `Plan:\n${overview}\n\nCurrent step: ${stepIndex + 1}. ${step.description}\n\nComplete this step. When done, respond with STEP_COMPLETE followed by a brief result.`
}

const withPath = (state: AgentState, path: Path): AgentState => ({ ...state, path })

const withHistory = (state: AgentState, history: Message[]): AgentState => ({ ...state, history })

const withPlan = (state: AgentState, plan: Plan | null): AgentState => ({ ...state, plan })

const withCompactions = (state: AgentState, history: Message[], compactions: CompactionBlock[]): AgentState => ({
  ...state,
  history,
  compactions,
})

const DEFAULT_COMPACTION_THRESHOLD = 20

const historyTooLarge = (history: Message[], threshold: number): boolean =>
  history.length > threshold

const maybeCompact = async (state: AgentState, opts: StepOptions): Promise<AgentState> => {
  const threshold = opts.compactionThreshold ?? DEFAULT_COMPACTION_THRESHOLD

  if (!opts.compact || !historyTooLarge(state.history, threshold)) {
    return state
  }

  const result = await opts.compact(state.history, state.compactions, opts.signal)
  return withCompactions(state, result.history, result.compactions)
}

const done = (state: AgentState, response: string): StepResult => ({
  state,
  response,
  needsUser: true,
})

const isAborted = (signal?: AbortSignal): boolean => signal?.aborted === true

const isCallLimitReached = (callsRemaining?: number): boolean => callsRemaining === 0

const decrementCalls = (callsRemaining?: number): number | undefined =>
  callsRemaining !== undefined ? callsRemaining - 1 : undefined

export const step = async (
  state: AgentState,
  message: string,
  opts: StepOptions,
  callsRemaining?: number
): Promise<StepResult> => {
  if (isAborted(opts.signal)) {
    return done(state, "")
  }

  if (isCallLimitReached(callsRemaining)) {
    return done(state, "Step exceeded call limit")
  }

  const historyWithUser = appendUserMessage(state.history, message)

  const { content, toolCalls } = await opts.callLLM(
    state.path,
    historyWithUser,
    opts.onChunk,
    opts.signal
  )

  if (isAborted(opts.signal)) {
    return done(state, "")
  }

  const historyWithResponse = appendAssistantMessage(historyWithUser, content)

  if (toolCalls?.length) {
    return handleToolCall(
      withHistory(state, historyWithResponse),
      toolCalls[0],
      opts
    )
  }

  const parsed = parseResponse(content)

  const nextCalls = decrementCalls(callsRemaining)

  const handlers: Record<string, () => Promise<StepResult>> = {
    text: async () => {
      const compacted = await maybeCompact(withHistory(withPath(state, "/chat/converse"), historyWithResponse), opts)
      return done(compacted, content)
    },

    task: async () => {
      const compacted = await maybeCompact(withPath(withHistory(state, historyWithResponse), "/chat/plan"), opts)
      return step(compacted, (parsed as { task: string }).task, opts, nextCalls)
    },

    plan: async () => {
      const plan = (parsed as { plan: Plan }).plan
      const compacted = await maybeCompact(withPlan(withPath(withHistory(state, historyWithResponse), "/chat/execute"), plan), opts)
      return step(compacted, buildStepPrompt(plan, 0), opts, opts.maxCallsPerStep)
    },

    step_complete: () => handleStepComplete(
      withHistory(state, historyWithResponse),
      (parsed as { summary: string }).summary,
      opts,
      nextCalls
    ),

    stuck: async () => {
      const compacted = await maybeCompact(withHistory(state, historyWithResponse), opts)
      return done(compacted, (parsed as { question: string }).question)
    },

    tool_call: async () => {
      const { name, id, args } = parsed as { name: string; id: string; args: unknown }
      const compacted = await maybeCompact(withHistory(state, historyWithResponse), opts)
      return handleToolCall(compacted, { name, id, args }, opts, nextCalls)
    },
  }

  const handler = handlers[parsed.type]
  if (handler) {
    return handler()
  }
  const compacted = await maybeCompact(withHistory(state, historyWithResponse), opts)
  return done(compacted, content)
}

const handleToolCall = async (
  state: AgentState,
  toolCall: { name: string; id: string; args: unknown },
  opts: StepOptions,
  callsRemaining?: number
): Promise<StepResult> => {
  const handler = opts.toolHandlers?.[toolCall.name]

  if (!handler) {
    const historyWithError = appendToolResult(state.history, toolCall.id, { error: `Unknown tool: ${toolCall.name}` })
    const compacted = await maybeCompact(withHistory(state, historyWithError), opts)
    return step(compacted, "Tool not found, please continue.", opts, callsRemaining)
  }

  try {
    const result = await handler(toolCall.args)
    const historyWithResult = appendToolResult(state.history, toolCall.id, result)
    const compacted = await maybeCompact(withHistory(state, historyWithResult), opts)
    return step(compacted, "Tool executed, please continue.", opts, callsRemaining)
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Tool execution failed"
    const historyWithError = appendToolResult(state.history, toolCall.id, { error: errorMsg })
    const compacted = await maybeCompact(withHistory(state, historyWithError), opts)
    return step(compacted, "Tool failed, please continue.", opts, callsRemaining)
  }
}

const handleStepComplete = async (
  state: AgentState,
  summary: string,
  opts: StepOptions,
  callsRemaining?: number
): Promise<StepResult> => {
  if (!state.plan) {
    const compacted = await maybeCompact(state, opts)
    return done(compacted, summary)
  }

  const currentIndex = findCurrentStepIndex(state.plan)
  if (currentIndex === null) {
    const compacted = await maybeCompact(withPlan(withPath(state, "/chat/converse"), null), opts)
    return done(compacted, "All steps completed")
  }

  const updatedPlan = markStepDone(state.plan, currentIndex)
  const nextIndex = findCurrentStepIndex(updatedPlan)

  if (nextIndex === null) {
    const compacted = await maybeCompact(withPlan(withPath(state, "/chat/converse"), null), opts)
    return done(compacted, "All steps completed")
  }

  const compacted = await maybeCompact(withPlan(state, updatedPlan), opts)
  return step(compacted, buildStepPrompt(updatedPlan, nextIndex), opts, opts.maxCallsPerStep)
}
