import type { Message } from "~/domain/llm"
import { getLlmUrl } from "~/lib/env"

export type StreamChatOptions = {
  prompt: string
  messages: Message[]
  signal?: AbortSignal
}

export async function* streamChat(options: StreamChatOptions): AsyncIterable<string> {
  const { prompt, messages, signal } = options
  const url = getLlmUrl(prompt)

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  })

  if (!response.ok) {
    throw new Error(`LLM request failed: ${response.status} ${response.statusText}`)
  }

  if (!response.body) {
    throw new Error("No response body")
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""

      for (const line of lines) {
        if (line.trim()) {
          yield line
        }
      }
    }

    if (buffer.trim()) {
      yield buffer
    }
  } finally {
    reader.releaseLock()
  }
}
