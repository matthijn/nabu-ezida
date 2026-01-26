import type { Block } from "../types"

export type Nudger = (history: Block[]) => string | null

export type MultiNudger = (history: Block[]) => string[]

const filterNonNull = (results: (string | null)[]): string[] =>
  results.filter((r): r is string => r !== null)

export const combine = (...nudgers: Nudger[]): Nudger => (history) => {
  for (const nudger of nudgers) {
    const result = nudger(history)
    if (result !== null) return result
  }
  return null
}

export const collect = (...nudgers: Nudger[]): MultiNudger => (history) =>
  filterNonNull(nudgers.map((n) => n(history)))
