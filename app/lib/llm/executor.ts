import type { BlockState, BlockSummary, Message, ToolHandlers, Effect } from "./types"
import {
  parseSSELine,
  handleStreamEvent,
  addToolResult,
  appendInternal,
  appendMessage,
  setStatus,
  setError,
  createInitialState,
} from "./"
import { streamChat } from "./client"

export type ExecuteBlockOptions = {
  prompt: string
  initialMessage: string
  history: Message[]
  sharedContext: BlockSummary[]
  toolHandlers: ToolHandlers
  onStateChange: (state: BlockState) => void
  signal?: AbortSignal
}

const isTerminalStatus = (state: BlockState): boolean =>
  state.status === "done" || state.status === "error"

const isExecuteToolEffect = (effect: Effect): effect is Effect & { type: "execute_tool" } =>
  effect.type === "execute_tool"

const extractErrorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error ? err.message : fallback

const hasInternalContext = (state: BlockState): boolean =>
  state.internal.length > 0

const buildSystemContext = (shared: BlockSummary[]): string => {
  if (shared.length === 0) return ""
  const summaries = shared.map((s) => `- ${s.summary}`).join("\n")
  return `\n\nContext from previous blocks:\n${summaries}`
}

const buildInternalContext = (state: BlockState): string =>
  state.internal.map((r) => `[${r.step}]: ${JSON.stringify(r.result)}`).join("\n")

const buildMessages = (
  history: Message[],
  state: BlockState,
  shared: BlockSummary[],
  userMessage?: string
): Message[] => {
  const messages: Message[] = [...history, ...state.messages]

  if (userMessage) {
    const contextSuffix = buildSystemContext(shared)
    messages.push({
      role: "user",
      content: userMessage + contextSuffix,
    })
  }

  if (hasInternalContext(state)) {
    messages.push({
      role: "system",
      content: `Internal context from previous steps:\n${buildInternalContext(state)}`,
    })
  }

  return messages
}

type ToolExecutionContext = {
  toolHandlers: ToolHandlers
  onStateChange: (state: BlockState) => void
}

const executeToolEffect = async (
  state: BlockState,
  effect: Effect & { type: "execute_tool" },
  ctx: ToolExecutionContext
): Promise<BlockState> => {
  const handler = ctx.toolHandlers[effect.name]

  if (!handler) {
    return addToolResult(state, effect.id, { error: `Unknown tool: ${effect.name}` })
  }

  try {
    const result = await handler(effect.args)
    let newState = appendInternal(state, { step: effect.name, result })
    newState = addToolResult(newState, effect.id, result)
    newState = setStatus(newState, "streaming")
    ctx.onStateChange(newState)
    return newState
  } catch (err) {
    const errorMessage = extractErrorMessage(err, "Tool execution failed")
    const newState = addToolResult(state, effect.id, { error: errorMessage })
    ctx.onStateChange(newState)
    return newState
  }
}

export const executeBlock = async (options: ExecuteBlockOptions): Promise<BlockState> => {
  const { prompt, initialMessage, history, sharedContext, toolHandlers, onStateChange, signal } = options

  let state = createInitialState()
  state = setStatus(state, "streaming")
  onStateChange(state)

  let currentMessage: string | undefined = initialMessage
  let toolCallAcc: { id: string; name: string; arguments: string } | null = null
  const toolCtx: ToolExecutionContext = { toolHandlers, onStateChange }

  while (!isTerminalStatus(state)) {
    const messages = buildMessages(history, state, sharedContext, currentMessage)
    currentMessage = undefined

    state = appendMessage(state, messages[messages.length - 1])
    state = setStatus(state, "streaming")
    onStateChange(state)

    try {
      for await (const line of streamChat({ prompt, messages, signal })) {
        const { event, toolCallAcc: newAcc } = parseSSELine(line, toolCallAcc)
        toolCallAcc = newAcc

        if (event) {
          const { state: newState, effects } = handleStreamEvent(state, event)
          state = newState
          onStateChange(state)

          for (const effect of effects) {
            if (isExecuteToolEffect(effect)) {
              state = await executeToolEffect(state, effect, toolCtx)
            }
          }
        }
      }
    } catch (err) {
      if (signal?.aborted) {
        state = setStatus(state, "done")
      } else {
        state = setError(state, extractErrorMessage(err, "Stream failed"))
      }
      onStateChange(state)
      break
    }
  }

  return state
}
