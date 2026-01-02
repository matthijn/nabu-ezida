import type { Message, ToolCall } from "~/lib/llm"
import type { AgentState, StepResult, StepOptions, Plan, Path } from "./types"
import { tryParseResponse } from "~/lib/orchestrator/parse"
import { buildExecuteStepPrompt, buildPlanPrompt, TERMINAL } from "./prompts"

type InternalToolCall = { id: string; name: string; args: unknown }

const toOpenAIToolCalls = (toolCalls: InternalToolCall[]): ToolCall[] =>
  toolCalls.map(tc => ({
    id: tc.id,
    type: "function" as const,
    function: {
      name: tc.name,
      arguments: JSON.stringify(tc.args),
    },
  }))

const appendMessage = (history: Message[], role: Message["role"], content: string, toolCallId?: string, toolCalls?: ToolCall[]): Message[] => [
  ...history,
  { role, content, ...(toolCallId && { tool_call_id: toolCallId }), ...(toolCalls && { tool_calls: toolCalls }) },
]

const appendUserMessage = (history: Message[], content: string): Message[] =>
  appendMessage(history, "user", content)

const appendSystemMessage = (history: Message[], content: string): Message[] =>
  appendMessage(history, "system", content)

const appendAssistantMessage = (history: Message[], content: string, toolCalls?: ToolCall[]): Message[] =>
  appendMessage(history, "assistant", content, undefined, toolCalls)

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
): Promise<StepResult> => {
  console.log("[Agent Nudge]", message)
  return appendAndContinue(state, appendSystemMessage, message, opts, callsRemaining)
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

  if (toolCalls?.length) {
    const historyWithToolCalls = appendAssistantMessage(state.history, content, toOpenAIToolCalls(toolCalls))
    return handleToolCalls(
      withHistory(state, historyWithToolCalls),
      toolCalls,
      opts,
      callsRemaining
    )
  }

  const historyWithResponse = appendAssistantMessage(state.history, content)

  const parsed = tryParseResponse(content)
  console.log("[Agent Parsed]", parsed)

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
      opts.onPlanChange?.(plan)
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
      const internalToolCall = { name, id, args }
      const historyWithToolCall = appendAssistantMessage(state.history, content, toOpenAIToolCalls([internalToolCall]))
      return handleToolCalls(withHistory(state, historyWithToolCall), [internalToolCall], opts, nextCalls)
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

type ToolResult = { id: string; result: unknown }

const snakeToCamel = (s: string): string =>
  s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())

const findHandler = (name: string, handlers?: StepOptions["toolHandlers"]) => {
  if (!handlers) return undefined
  return handlers[name] ?? handlers[snakeToCamel(name)]
}

const executeSingleTool = async (
  toolCall: InternalToolCall,
  opts: StepOptions
): Promise<ToolResult> => {
  const handler = findHandler(toolCall.name, opts.toolHandlers)

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
  toolCalls: InternalToolCall[],
  opts: StepOptions,
  callsRemaining?: number
): Promise<StepResult> => {
  console.log("[Agent Tool Calls]", toolCalls)
  const results = await Promise.all(
    toolCalls.map(tc => executeSingleTool(tc, opts))
  )
  console.log("[Agent Tool Results]", results)

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
    return done(withPath(state, "/chat/converse"), TERMINAL.allStepsCompleted)
  }

  const updatedPlan = markStepDone(state.plan, currentIndex)
  opts.onPlanChange?.(updatedPlan)
  const nextIndex = findCurrentStepIndex(updatedPlan)

  if (nextIndex === null) {
    return done(withPlan(withPath(state, "/chat/converse"), updatedPlan), TERMINAL.allStepsCompleted)
  }

  return stepWithSystem(withPlan(state, updatedPlan), buildExecuteStepPrompt(updatedPlan, nextIndex), opts, opts.maxCallsPerStep)
}
