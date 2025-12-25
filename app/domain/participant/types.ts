export type ParticipantType = "human" | "llm"

export type Participant = {
  id: string
  type: ParticipantType
  name: string
  color: string
  initial?: string
  image?: string
}

export const NABU: Participant = {
  id: "nabu",
  type: "llm",
  name: "Nabu",
  color: "#16a34a",
  initial: "N",
}
