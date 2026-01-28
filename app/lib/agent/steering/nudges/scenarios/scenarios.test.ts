import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync, existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import type { Block } from "../../../types"
import { nudge } from "../index"
import { createFileEntry, type FileEntry } from "~/lib/files"

const __dirname = dirname(fileURLToPath(import.meta.url))
const EMPTY_NUDGE = "EMPTY_NUDGE"

type RawFiles = Record<string, string>
type Files = Record<string, FileEntry>

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(path, "utf-8")) as T

const readFilesJson = (path: string): Files => {
  if (!existsSync(path)) return {}
  const raw = readJson<RawFiles>(path)
  return Object.fromEntries(
    Object.entries(raw).map(([name, content]) => [name, createFileEntry(content)])
  )
}

const shouldNudge = (block: Block): boolean =>
  block.type === "user" || block.type === "tool_result"

const runScenario = (name: string): { actual: Block[]; expected: Block[] } => {
  const basePath = join(__dirname, name, name)
  const input = readJson<Block[]>(`${basePath}.json`)
  const files = readFilesJson(`${basePath}.files.json`)
  const expected = readJson<Block[]>(`${basePath}.expected.json`)

  const history: Block[] = []
  for (const block of input) {
    history.push(block)
    if (shouldNudge(block)) {
      const nudges = nudge(history, files, EMPTY_NUDGE)
      for (const n of nudges) {
        history.push({ type: "system", content: n })
      }
    }
  }

  return { actual: history, expected }
}

const getScenarioNames = (): string[] => {
  const entries = readdirSync(__dirname, { withFileTypes: true })
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
}

describe("nudge scenarios", () => {
  const scenarios = getScenarioNames()

  scenarios.forEach((name) => {
    it(name, () => {
      const { actual, expected } = runScenario(name)
      expect(actual).toEqual(expected)
    })
  })
})
