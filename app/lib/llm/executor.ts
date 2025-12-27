import type { BlockState, BlockSummary, Message, ToolHandlers } from "~/domain/llm"
import {
  parseSSELine,
  handleStreamEvent,
  addToolResult,
  appendInternal,
  appendMessage,
  setStatus,
  createInitialState,
} from "~/domain/llm"
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

const buildSystemContext = (shared: BlockSummary[]): string => {
  if (shared.length === 0) return ""
  const summaries = shared.map((s) => `- ${s.summary}`).join("\n")
  return `\n\nContext from previous blocks:\n${summaries}`
}

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

  if (state.internal.length > 0) {
    const internalContext = state.internal
      .map((r) => `[${r.step}]: ${JSON.stringify(r.result)}`)
      .join("\n")
    messages.push({
      role: "system",
      content: `Internal context from previous steps:\n${internalContext}`,
    })
  }

  return messages
}

export const executeBlock = async (options: ExecuteBlockOptions): Promise<BlockState> => {
  const { prompt, initialMessage, history, sharedContext, toolHandlers, onStateChange, signal } = options

  let state = createInitialState()
  state = setStatus(state, "streaming")
  onStateChange(state)

  let currentMessage: string | undefined = initialMessage
  let toolCallAcc: { id: string; name: string; arguments: string } | null = null

  while (state.status !== "done" && state.status !== "error") {
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
            if (effect.type === "execute_tool") {
              const handler = toolHandlers[effect.name]
              if (!handler) {
                state = addToolResult(state, effect.id, { error: `Unknown tool: ${effect.name}` })
                continue
              }

              try {
                const result = await handler(effect.args)
                state = appendInternal(state, { step: effect.name, result })
                state = addToolResult(state, effect.id, result)
                state = setStatus(state, "streaming")
                onStateChange(state)
              } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "Tool execution failed"
                state = addToolResult(state, effect.id, { error: errorMessage })
                onStateChange(state)
              }
            }
          }
        }
      }
    } catch (err) {
      if (signal?.aborted) {
        state = setStatus(state, "done")
      } else {
        state = {
          ...state,
          status: "error",
          error: err instanceof Error ? err.message : "Stream failed",
        }
      }
      onStateChange(state)
      break
    }
  }

  return state
}
