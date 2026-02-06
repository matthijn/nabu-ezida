import type { ToolCall } from "../types"

export type Finding = {
  id: string
  direction: string
  internal: string | null
  learned: string
}

export type DerivedOrientation = {
  question: string
  findings: Finding[]
  currentDirection: string | null
  completed: boolean
}

export const createOrientationFromCall = (call: ToolCall): DerivedOrientation => ({
  question: call.args.question as string,
  findings: [],
  currentDirection: (call.args.direction as string) || null,
  completed: false,
})

export const addFinding = (orientation: DerivedOrientation, direction: string, internal: string | null, learned: string): DerivedOrientation => ({
  ...orientation,
  findings: [...orientation.findings, { id: String(orientation.findings.length + 1), direction, internal, learned }],
})

export const hasActiveOrientation = (orientation: DerivedOrientation | null): boolean =>
  orientation !== null && !orientation.completed
