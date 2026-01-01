import type { Message } from "~/lib/llm"
import type { AgentState, StepResult, StepOptions, Plan, Path } from "./types"
import { tryParseResponse } from "~/lib/orchestrator/parse"
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

const done = (state: AgentState, response: string): StepResult => ({
  state,
  response,
  needsUser: true,
})

const isAborted = (signal?: AbortSignal): boolean => signal?.aborted === true

const isCallLimitReached = (callsRemaining?: number): boolean => callsRemaining === 0

const decrementCalls = (callsRemaining?: number): number | undefined =>
  callsRemaining !== undefined ? callsRemaining - 1 : undefined

type AppendFn = (history: Message[], content: string) => Message[]

const appendAndContinue = async (
  state: AgentState,
  appendFn: AppendFn,
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
  const history = appendFn(state.history, message)
  return continueFromHistory(withHistory(state, history), opts, callsRemaining)
}

export const step = (
  state: AgentState,
  message: string,
  opts: StepOptions,
  callsRemaining?: number
): Promise<StepResult> => appendAndContinue(state, appendUserMessage, message, opts, callsRemaining)

const stepWithSystem = (
  state: AgentState,
  message: string,
  opts: StepOptions,
  callsRemaining?: number
): Promise<StepResult> => appendAndContinue(state, appendSystemMessage, message, opts, callsRemaining)

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
    return handleToolCalls(
      withHistory(state, historyWithResponse),
      toolCalls,
      opts,
      callsRemaining
    )
  }

  const parsed = tryParseResponse(content)

  const nextCalls = decrementCalls(callsRemaining)

  const handlers: Record<string, () => Promise<StepResult>> = {
    text: async () => done(withHistory(withPath(state, "/chat/converse"), historyWithResponse), content),

    task: async () => {
      const task = (parsed as { task: string }).task
      const nextState = withPath(withHistory(state, historyWithResponse), "/chat/plan")
      return stepWithSystem(nextState, buildPlanPrompt(task), opts, nextCalls)
    },

    plan: async () => {
      const plan = (parsed as { plan: Plan }).plan
      const nextState = withPlan(withPath(withHistory(state, historyWithResponse), "/chat/execute"), plan)
      return stepWithSystem(nextState, buildExecuteStepPrompt(plan, 0), opts, opts.maxCallsPerStep)
    },

    step_complete: () => handleStepComplete(
      withHistory(state, historyWithResponse),
      (parsed as { summary: string }).summary,
      opts,
      nextCalls
    ),

    stuck: async () => done(withHistory(state, historyWithResponse), (parsed as { question: string }).question),

    tool_call: async () => {
      const { name, id, args } = parsed as { name: string; id: string; args: unknown }
      return handleToolCalls(withHistory(state, historyWithResponse), [{ name, id, args }], opts, nextCalls)
    },

    parse_error: async () => {
      const { message } = parsed as { message: string }
      return stepWithSystem(
        withHistory(state, historyWithResponse),
        `Your response had a format error: ${message}. Please try again with the correct JSON format.`,
        opts,
        nextCalls
      )
    },
  }

  const handler = handlers[parsed.type]
  if (handler) {
    return handler()
  }
  return done(withHistory(state, historyWithResponse), content)
}

type ToolCall = { name: string; id: string; args: unknown }
type ToolResult = { id: string; result: unknown }

const executeSingleTool = async (
  toolCall: ToolCall,
  opts: StepOptions
): Promise<ToolResult> => {
  const handler = opts.toolHandlers?.[toolCall.name]

  if (!handler) {
    return { id: toolCall.id, result: { error: `Unknown tool: ${toolCall.name}` } }
  }

  try {
    const result = await handler(toolCall.args)
    return { id: toolCall.id, result }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Tool execution failed"
    return { id: toolCall.id, result: { error: errorMsg } }
  }
}

const appendToolResults = (history: Message[], results: ToolResult[]): Message[] =>
  results.reduce((h, r) => appendToolResult(h, r.id, r.result), history)

const handleToolCalls = async (
  state: AgentState,
  toolCalls: ToolCall[],
  opts: StepOptions,
  callsRemaining?: number
): Promise<StepResult> => {
  const results = await Promise.all(
    toolCalls.map(tc => executeSingleTool(tc, opts))
  )

  const historyWithResults = appendToolResults(state.history, results)
  return continueFromHistory(withHistory(state, historyWithResults), opts, callsRemaining)
}

const handleStepComplete = async (
  state: AgentState,
  summary: string,
  opts: StepOptions,
  callsRemaining?: number
): Promise<StepResult> => {
  if (!state.plan) {
    return done(state, summary)
  }

  const currentIndex = findCurrentStepIndex(state.plan)
  if (currentIndex === null) {
    return done(withPlan(withPath(state, "/chat/converse"), null), TERMINAL.allStepsCompleted)
  }

  const updatedPlan = markStepDone(state.plan, currentIndex)
  const nextIndex = findCurrentStepIndex(updatedPlan)

  if (nextIndex === null) {
    return done(withPlan(withPath(state, "/chat/converse"), null), TERMINAL.allStepsCompleted)
  }

  return stepWithSystem(withPlan(state, updatedPlan), buildExecuteStepPrompt(updatedPlan, nextIndex), opts, opts.maxCallsPerStep)
}
