import type { Command } from "./commands"
import { jsonHeaders, parseResponse } from "~/lib/http"

export type DomainEvent = {
  id: string
  type: "DomainEvent"
  action: string
  aggregate_type: string
  aggregate_id: string
  causation_id: string
  timestamp: string
  version: number
  actor?: {
    user_id: string
    actor_type: "human" | "llm" | "system"
  }
  payload: unknown
}

export type CommandResult = {
  status: number
  result: DomainEvent
}

export { isHttpError as isCommandError, formatError as formatCommandError, formatNetworkError } from "~/lib/http"

const postCommand = async (baseUrl: string, command: Command): Promise<CommandResult> => {
  const response = await fetch(`${baseUrl}/commands`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify(command),
  })

  const result = await parseResponse<DomainEvent>(response)
  return { status: response.status, result }
}

export const createClient = (baseUrl: string) => ({
  sendCommand: (command: Command) => postCommand(baseUrl, command),
})
