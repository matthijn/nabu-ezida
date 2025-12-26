export type ParticipantType = "human" | "llm"

export type ParticipantVariant = "brand" | "neutral" | "error" | "success" | "warning"

export type Participant = {
  id: string
  type: ParticipantType
  name: string
  description: string
  variant: ParticipantVariant
  initial?: string
  image?: string
}

export const NABU: Participant = {
  id: "nabu",
  type: "llm",
  name: "Nabu",
  description: "AI research assistant",
  variant: "brand",
  initial: "N",
}

export const CURRENT_USER: Participant = {
  id: "user-1",
  type: "human",
  name: "You",
  description: "",
  variant: "brand",
  initial: "M",
}

export const PARTICIPANTS: Participant[] = [
  NABU,
  { id: "jane", type: "human", name: "Jane", description: "Data analyst", variant: "warning", initial: "J" },
  { id: "alex", type: "human", name: "Alex", description: "Content strategist", variant: "success", initial: "A" },
]
