import { getApiUrl } from "../env"

type Command = {
  type: string
  aggregate_id?: string
  payload: unknown
}

type ActorType = "human" | "llm" | "system"

type Actor = {
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

type CommandResult = {
  status: number
  result: DomainEvent
}

type ErrorResponse = {
  message: string
  fields?: Record<string, string>
}

type CommandError = {
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

const sendCommand = async (command: Command): Promise<CommandResult> => {
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

type BatchResult = {
  index: number
  success: boolean
  error?: string
  result?: DomainEvent
}

type BatchResponse = {
  results: BatchResult[]
  successCount: number
  failureCount: number
}

const sendCommands = async (commands: Command[]): Promise<BatchResponse> => {
  if (commands.length === 0) return { results: [], successCount: 0, failureCount: 0 }
  if (commands.length === 1) {
    const result = await sendCommand(commands[0])
    return { results: [{ index: 0, success: true, result: result.result }], successCount: 1, failureCount: 0 }
  }

  const url = getApiUrl("/commands")

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(commands),
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

  return response.json()
}
