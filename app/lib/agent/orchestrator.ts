import type { AgentState, AgentMessage, Plan, Step } from "~/domain/agent"
import type { Message, ToolHandlers } from "~/domain/llm"
import { createInitialState, applyMessage, hasMoreSteps, selectEndpoint, selectTools } from "~/domain/agent"
import { executeBlock } from "~/lib/llm"

const MAX_STEP_ATTEMPTS = 5

type OrchestratorOptions = {
  toolHandlers: ToolHandlers
  onMessage: (msg: AgentMessage) => void
  onStateChange: (state: AgentState) => void
  signal?: AbortSignal
}

type ParsedResponse = {
  type: "text" | "task" | "step_complete" | "stuck"
  content?: string
  task?: string
  plan?: Plan
  summary?: string
  question?: string
}

const parseResponse = (content: string): ParsedResponse => {
  // Try to parse structured response
  try {
    const match = content.match(/```json\n?([\s\S]*?)\n?```/)
    if (match) {
      const parsed = JSON.parse(match[1])
      if (parsed.type) return parsed
    }
  } catch {
    // Not structured, continue
  }

  // Check for step complete marker
  if (content.includes("STEP_COMPLETE")) {
    const summary = content.replace("STEP_COMPLETE", "").trim()
    return { type: "step_complete", summary }
  }

  // Check for task detection
  if (content.includes("TASK:")) {
    const task = content.split("TASK:")[1]?.trim()
    return { type: "task", task }
  }

  // Default to text
  return { type: "text", content }
}

const buildStepPrompt = (state: AgentState): string => {
  if (!state.plan || state.currentStep === null) return ""

  const step = state.plan.steps[state.currentStep]
  const planSummary = state.plan.steps
    .map((s, i) => `${i + 1}. [${s.status}] ${s.description}`)
    .join("\n")

  return `
Plan:
${planSummary}

Current step: ${state.currentStep + 1}. ${step.description}

Complete this step. When done, respond with STEP_COMPLETE followed by a brief summary.
If you're stuck, explain what's blocking you.
`.trim()
}

const toLLMMessages = (messages: AgentMessage[]): Message[] =>
  messages
    .filter((m): m is AgentMessage & { type: "text" } => m.type === "text")
    .map((m) => ({ role: "user" as const, content: m.content }))

export const runAgent = async (
  userMessage: string,
  initialState: AgentState | null,
  opts: OrchestratorOptions
): Promise<AgentState> => {
  let state = initialState ?? createInitialState()

  const emit = (msg: AgentMessage) => {
    state = applyMessage(state, msg)
    opts.onMessage(msg)
    opts.onStateChange(state)
  }

  // Add user message
  emit({ type: "text", content: userMessage })

  // 1. Converse - determine what to do
  const converseResult = await executeBlock({
    prompt: selectEndpoint(state),
    initialMessage: userMessage,
    history: toLLMMessages(state.messages),
    sharedContext: [],
    toolHandlers: {},
    onStateChange: () => {},
    signal: opts.signal,
  })

  const lastMessage = converseResult.messages.find((m) => m.role === "assistant")
  if (!lastMessage?.content) {
    emit({ type: "error", message: "No response from LLM" })
    return state
  }

  const parsed = parseResponse(lastMessage.content)

  // 2. Just conversation - reply and done
  if (parsed.type === "text") {
    emit({ type: "text", content: parsed.content ?? "" })
    return state
  }

  // 3. Task detected - get plan
  if (parsed.type === "task" && parsed.task) {
    emit({ type: "thinking", content: `Planning: ${parsed.task}` })

    const planResult = await executeBlock({
      prompt: "/chat/plan",
      initialMessage: parsed.task,
      history: toLLMMessages(state.messages),
      sharedContext: [],
      toolHandlers: {},
      onStateChange: () => {},
      signal: opts.signal,
    })

    const planMessage = planResult.messages.find((m) => m.role === "assistant")
    if (!planMessage?.content) {
      emit({ type: "error", message: "Failed to create plan" })
      return state
    }

    const planParsed = parsePlan(planMessage.content)
    if (!planParsed) {
      emit({ type: "error", message: "Failed to parse plan" })
      return state
    }

    emit({ type: "plan", plan: planParsed })

    // 4. Execute steps
    state = await executeSteps(state, opts)
  }

  return state
}

const executeSteps = async (
  initialState: AgentState,
  opts: OrchestratorOptions
): Promise<AgentState> => {
  let state = initialState

  const emit = (msg: AgentMessage) => {
    state = applyMessage(state, msg)
    opts.onMessage(msg)
    opts.onStateChange(state)
  }

  while (state.plan && state.currentStep !== null && state.currentStep < state.plan.steps.length) {
    const stepIndex = state.currentStep
    emit({ type: "step_start", stepIndex })

    let attempts = 0
    let stepComplete = false

    while (!stepComplete && attempts < MAX_STEP_ATTEMPTS) {
      if (opts.signal?.aborted) {
        emit({ type: "error", message: "Aborted" })
        return state
      }

      const stepPrompt = buildStepPrompt(state)

      const stepResult = await executeBlock({
        prompt: "/chat/execute",
        initialMessage: stepPrompt,
        history: toLLMMessages(state.messages),
        sharedContext: [],
        toolHandlers: opts.toolHandlers,
        onStateChange: (blockState) => {
          if (blockState.streaming) {
            // Could emit streaming updates here
          }
        },
        signal: opts.signal,
      })

      const stepMessage = stepResult.messages.find((m) => m.role === "assistant")
      if (!stepMessage?.content) {
        attempts++
        continue
      }

      const stepParsed = parseResponse(stepMessage.content)

      if (stepParsed.type === "step_complete") {
        stepComplete = true
        emit({ type: "step_done", stepIndex, summary: stepParsed.summary ?? "" })

        // Move to next step
        if (hasMoreSteps(state)) {
          state = { ...state, currentStep: stepIndex + 1 }
        } else {
          emit({ type: "done", summary: "All steps completed" })
          return state
        }
      } else if (stepParsed.type === "stuck") {
        emit({ type: "stuck", stepIndex, question: stepParsed.question ?? "What should I do?" })
        return state // Pause for user input
      } else {
        // LLM responded but didn't complete step - nudge it
        attempts++
        if (attempts >= MAX_STEP_ATTEMPTS) {
          emit({ type: "stuck", stepIndex, question: "Unable to complete step after multiple attempts. What should I do?" })
          return state
        }
      }
    }
  }

  return state
}

const parsePlan = (content: string): Plan | null => {
  try {
    // Try JSON first
    const match = content.match(/```json\n?([\s\S]*?)\n?```/)
    if (match) {
      const parsed = JSON.parse(match[1])
      if (parsed.steps && Array.isArray(parsed.steps)) {
        return {
          task: parsed.task ?? "Task",
          steps: parsed.steps.map((s: string | { description: string }, i: number) => ({
            id: String(i + 1),
            description: typeof s === "string" ? s : s.description,
            status: "pending" as const,
          })),
        }
      }
    }

    // Fall back to numbered list parsing
    const lines = content.split("\n").filter((l) => /^\d+\./.test(l.trim()))
    if (lines.length > 0) {
      return {
        task: "Task",
        steps: lines.map((line, i) => ({
          id: String(i + 1),
          description: line.replace(/^\d+\.\s*/, "").trim(),
          status: "pending" as const,
        })),
      }
    }
  } catch {
    // Parse failed
  }

  return null
}
