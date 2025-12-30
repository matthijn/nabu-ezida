import type { Message, CompactionBlock } from "~/lib/llm"
import type { AgentState, StepResult, StepOptions, Plan, Path } from "./types"
import { parseResponse } from "~/lib/orchestrator/parse"
import { buildExecuteStepPrompt, buildPlanPrompt, TERMINAL } from "./prompts"

const appendMessage = (history: Message[], role: Message["role"], content: string, toolCallId?: string): Message[] => [
  ...history,
  { role, content, ...(toolCallId && { tool_call_id: toolCallId }) },
]

const appendUserMessage = (history: Message[], content: string): Message[] =>
  appendMessage(history, "user", content)

const appendSystemMessage = (history: Message[], content: string): Message[] =>
  appendMessage(history, "system", content)

const appendAssistantMessage = (history: Message[], content: string): Message[] =>
  appendMessage(history, "assistant", content)

const appendToolResult = (history: Message[], toolCallId: string, result: unknown): Message[] =>
  appendMessage(history, "tool", JSON.stringify(result), toolCallId)

const findCurrentStepIndex = (plan: Plan): number | null => {
  const idx = plan.steps.findIndex((s) => s.status === "pending")
  return idx === -1 ? null : idx
}

const markStepDone = (plan: Plan, stepIndex: number): Plan => ({
  ...plan,
  steps: plan.steps.map((s, i) => (i === stepIndex ? { ...s, status: "done" as const } : s)),
})

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
    return done(state, TERMINAL.callLimitReached)
  }
  const history = appendUserMessage(state.history, message)
  return continueFromHistory(withHistory(state, history), opts, callsRemaining)
}

const stepWithSystem = async (
  state: AgentState,
  message: string,
  opts: StepOptions,
  callsRemaining?: number
): Promise<StepResult> => {
  if (isAborted(opts.signal)) {
    return done(state, "")
  }
  if (isCallLimitReached(callsRemaining)) {
    return done(state, TERMINAL.callLimitReached)
  }
  const history = appendSystemMessage(state.history, message)
  return continueFromHistory(withHistory(state, history), opts, callsRemaining)
}

const continueFromHistory = async (
  state: AgentState,
  opts: StepOptions,
  callsRemaining?: number
): Promise<StepResult> => {
  if (isAborted(opts.signal)) {
    return done(state, "")
  }

  if (isCallLimitReached(callsRemaining)) {
    return done(state, TERMINAL.callLimitReached)
  }

  const { content, toolCalls } = await opts.callLLM(
    state.path,
    state.history,
    opts.onChunk,
    opts.signal
  )

  if (isAborted(opts.signal)) {
    return done(state, "")
  }

  const historyWithResponse = appendAssistantMessage(state.history, content)

  if (toolCalls?.length) {
    return handleToolCall(
      withHistory(state, historyWithResponse),
      toolCalls[0],
      opts,
      callsRemaining
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
      const task = (parsed as { task: string }).task
      const compacted = await maybeCompact(withPath(withHistory(state, historyWithResponse), "/chat/plan"), opts)
      return stepWithSystem(compacted, buildPlanPrompt(task), opts, nextCalls)
    },

    plan: async () => {
      const plan = (parsed as { plan: Plan }).plan
      const compacted = await maybeCompact(withPlan(withPath(withHistory(state, historyWithResponse), "/chat/execute"), plan), opts)
      return stepWithSystem(compacted, buildExecuteStepPrompt(plan, 0), opts, opts.maxCallsPerStep)
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
    return continueFromHistory(compacted, opts, callsRemaining)
  }

  try {
    const result = await handler(toolCall.args)
    const historyWithResult = appendToolResult(state.history, toolCall.id, result)
    const compacted = await maybeCompact(withHistory(state, historyWithResult), opts)
    return continueFromHistory(compacted, opts, callsRemaining)
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Tool execution failed"
    const historyWithError = appendToolResult(state.history, toolCall.id, { error: errorMsg })
    const compacted = await maybeCompact(withHistory(state, historyWithError), opts)
    return continueFromHistory(compacted, opts, callsRemaining)
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
    return done(compacted, TERMINAL.allStepsCompleted)
  }

  const updatedPlan = markStepDone(state.plan, currentIndex)
  const nextIndex = findCurrentStepIndex(updatedPlan)

  if (nextIndex === null) {
    const compacted = await maybeCompact(withPlan(withPath(state, "/chat/converse"), null), opts)
    return done(compacted, TERMINAL.allStepsCompleted)
  }

  const compacted = await maybeCompact(withPlan(state, updatedPlan), opts)
  return stepWithSystem(compacted, buildExecuteStepPrompt(updatedPlan, nextIndex), opts, opts.maxCallsPerStep)
}
