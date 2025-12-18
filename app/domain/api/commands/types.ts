export type ActorType = "human" | "llm" | "system"

export type Actor = {
  user_id: string
  actor_type: ActorType
}

export type Command<T = unknown> = {
  type: "Command"
  action: string
  aggregate_type: string
  aggregate_id: string
  payload: T
  actor?: Actor
}

export const createCommand = <T>(
  action: string,
  aggregateType: string,
  aggregateId: string,
  payload: T,
  actor?: Actor
): Command<T> => ({
  type: "Command",
  action,
  aggregate_type: aggregateType,
  aggregate_id: aggregateId,
  payload,
  actor,
})

export const createHumanActor = (userId: string): Actor => ({
  user_id: userId,
  actor_type: "human",
})

export const createLlmActor = (userId: string): Actor => ({
  user_id: userId,
  actor_type: "llm",
})
