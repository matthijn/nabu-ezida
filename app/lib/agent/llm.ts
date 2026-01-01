import type { Message } from "~/lib/llm"
import type { Path, LLMCaller, OnChunk } from "./types"
import { getLlmUrl } from "~/lib/env"
import { parseSSELine } from "~/lib/llm/stream"

const parseToolArgs = (args: string): unknown => {
  try {
    return JSON.parse(args)
  } catch {
    return {}
  }
}

export const createLLMCaller = (): LLMCaller => async (
  path: Path,
  messages: Message[],
  onChunk?: OnChunk,
  signal?: AbortSignal
) => {
  const url = getLlmUrl(path)

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  })

  if (!response.ok) {
    throw new Error(`LLM request failed: ${response.status}`)
  }

  if (!response.body) {
    throw new Error("No response body")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let content = ""
  let toolCallAcc: { id: string; name: string; arguments: string } | null = null
  const toolCalls: { id: string; name: string; args: unknown }[] = []

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""

      for (const line of lines) {
        if (!line.trim()) continue

        const { event, toolCallAcc: newAcc } = parseSSELine(line, toolCallAcc)
        toolCallAcc = newAcc

        if (!event) continue

        if (event.type === "text_delta") {
          content += event.content
          onChunk?.(event.content)
        }

        if (event.type === "tool_call") {
          toolCalls.push({
            id: event.id,
            name: event.name,
            args: parseToolArgs(event.arguments),
          })
        }
      }
    }

    if (buffer.trim()) {
      const { event } = parseSSELine(buffer, toolCallAcc)
      if (event?.type === "text_delta") {
        content += event.content
        onChunk?.(event.content)
      }
      if (event?.type === "tool_call") {
        toolCalls.push({
          id: event.id,
          name: event.name,
          args: parseToolArgs(event.arguments),
        })
      }
    }
  } finally {
    reader.releaseLock()
  }

  return { content, toolCalls: toolCalls.length > 0 ? toolCalls : undefined }
}
