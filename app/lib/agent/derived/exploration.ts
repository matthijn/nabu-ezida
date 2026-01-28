import type { ToolCall } from "../types"

export type Finding = {
  id: string
  direction: string
  internal: string | null
  learned: string
}

export type DerivedExploration = {
  question: string
  findings: Finding[]
  currentDirection: string | null
  completed: boolean
}

export const createExplorationFromCall = (call: ToolCall): DerivedExploration => ({
  question: call.args.question as string,
  findings: [],
  currentDirection: (call.args.direction as string) || null,
  completed: false,
})

export const addFinding = (exploration: DerivedExploration, direction: string, internal: string | null, learned: string): DerivedExploration => ({
  ...exploration,
  findings: [...exploration.findings, { id: String(exploration.findings.length + 1), direction, internal, learned }],
})

export const hasActiveExploration = (exploration: DerivedExploration | null): boolean =>
  exploration !== null && !exploration.completed
