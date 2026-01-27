import type { Block } from "../types"
import type { FileEntry } from "~/lib/files"

export type Files = Record<string, FileEntry>

export type Nudger = (history: Block[], files: Files) => string | null

export type MultiNudger = (history: Block[], files: Files) => string[]

const filterNonNull = (results: (string | null)[]): string[] =>
  results.filter((r): r is string => r !== null)

export const combine = (...nudgers: Nudger[]): Nudger => (history, files) => {
  for (const nudger of nudgers) {
    const result = nudger(history, files)
    if (result !== null) return result
  }
  return null
}

export const collect = (...nudgers: Nudger[]): MultiNudger => (history, files) =>
  filterNonNull(nudgers.map((n) => n(history, files)))
