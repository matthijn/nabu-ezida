import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync, existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import type { Block } from "../../../types"
import { createNudge } from "../index"

const __dirname = dirname(fileURLToPath(import.meta.url))

type Files = Record<string, string>

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(path, "utf-8")) as T

const readFilesJson = (path: string): Files => {
  if (!existsSync(path)) return {}
  return readJson<Files>(path)
}

const shouldNudge = (block: Block): boolean =>
  block.type === "user" || block.type === "tool_result"

const runScenario = async (name: string): Promise<{ actual: Block[]; expected: Block[] }> => {
  const basePath = join(__dirname, name, name)
  const input = readJson<Block[]>(`${basePath}.json`)
  const files = readFilesJson(`${basePath}.files.json`)
  const expected = readJson<Block[]>(`${basePath}.expected.json`)

  const nudge = createNudge(() => files)
  const history: Block[] = []
  for (const block of input) {
    history.push(block)
    if (shouldNudge(block)) {
      const nudgeBlocks = await nudge(history)
      for (const n of nudgeBlocks) {
        history.push(n)
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
    it(name, async () => {
      const { actual, expected } = await runScenario(name)
      expect(actual).toEqual(expected)
    })
  })
})
