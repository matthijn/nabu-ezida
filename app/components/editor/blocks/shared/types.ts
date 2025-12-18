export type LockState =
  | { type: "none" }
  | { type: "coded" }
  | { type: "user"; userId: string }
  | { type: "ai"; taskId: string }

export type CodedSection = {
  start: number
  end: number
  codeIds: string[]
  sectionIds: string[]
}

export type TableCodedSections = Record<string, CodedSection[]>
