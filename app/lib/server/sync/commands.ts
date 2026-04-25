import { getApiUrl } from "../env"
import type { Command, CommandResult } from "./types"

interface ErrorResponse {
  error: string
}

const parseErrorBody = async (response: Response): Promise<string> => {
  try {
    const body = (await response.json()) as ErrorResponse
    return body.error ?? "Unknown error"
  } catch {
    return response.statusText
  }
}

const gzipCompress = async (data: string): Promise<Blob> => {
  const stream = new Blob([data]).stream().pipeThrough(new CompressionStream("gzip"))
  return new Response(stream).blob()
}

export const sendCommand = async (projectId: string, command: Command): Promise<CommandResult> => {
  const url = getApiUrl(`/commands/${projectId}`)
  const json = JSON.stringify(command)

  try {
    const body = await gzipCompress(json)
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Encoding": "gzip" },
      body,
    })

    if (!response.ok) {
      const error = await parseErrorBody(response)
      return { ok: false, error }
    }

    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error"
    return { ok: false, error: message }
  }
}
