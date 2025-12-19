import { getApiUrl } from "../env"

export type Command = {
  type: string
  aggregate_id?: string
  payload: unknown
}

export type ActorType = "human" | "llm" | "system"

export type Actor = {
  user_id: string
  actor_type: ActorType
}

export type DomainEvent = {
  id: string
  type: "DomainEvent"
  action: string
  aggregate_type: string
  aggregate_id: string
  causation_id: string
  timestamp: string
  version: number
  payload: unknown
  actor: Actor
}

export type CommandResult = {
  status: number
  result: DomainEvent
}

export type ErrorResponse = {
  message: string
  fields?: Record<string, string>
}

export type CommandError = {
  status: number
  statusText: string
  body: ErrorResponse | null
}

const parseErrorBody = async (response: Response): Promise<ErrorResponse | null> => {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export const isCommandError = (error: unknown): error is CommandError =>
  typeof error === "object" && error !== null && "status" in error && "statusText" in error

export const formatCommandError = (error: CommandError): { title: string; description: string } => ({
  title: `${error.status} ${error.statusText}`,
  description: error.body?.message ?? "Unknown error",
})

export const formatNetworkError = (): { title: string; description: string } => ({
  title: "Network Error",
  description: "Could not connect to server",
})

export const sendCommand = async (command: Command): Promise<CommandResult> => {
  const url = getApiUrl("/commands")

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(command),
  })

  if (!response.ok) {
    const body = await parseErrorBody(response)
    const error: CommandError = {
      status: response.status,
      statusText: response.statusText,
      body,
    }
    throw error
  }

  return {
    status: response.status,
    result: await response.json(),
  }
}
