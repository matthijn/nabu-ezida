export type ParticipantType = "human" | "llm"

export type ParticipantVariant = "brand" | "neutral" | "error" | "success" | "warning"

export interface Participant {
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
