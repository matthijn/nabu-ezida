export type NabuBlockType = "nabuQuestion"

export type NabuQuestionProps = {
  threadId?: string
  initiator?: unknown
  recipient?: unknown
  hasSubmitted?: boolean
  preview?: string
}
