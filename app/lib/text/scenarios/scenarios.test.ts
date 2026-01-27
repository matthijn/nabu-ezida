import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync, existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { splitByLines } from "../markdown"

const __dirname = dirname(fileURLToPath(import.meta.url))

type ScenarioConfig = {
  targetLines: number
}

type ScenarioExpected = string[]

const readFile = (path: string): string => readFileSync(path, "utf-8")

const readJson = <T>(path: string): T => JSON.parse(readFile(path)) as T

const runScenario = (name: string): { actual: string[]; expected: string[] } => {
  const dir = join(__dirname, name)
  const input = readFile(join(dir, "input.md"))
  const config = readJson<ScenarioConfig>(join(dir, "config.json"))
  const expected = readJson<ScenarioExpected>(join(dir, "expected.json"))

  const actual = splitByLines(input, config.targetLines)

  return { actual, expected }
}

const getScenarioNames = (): string[] => {
  const entries = readdirSync(__dirname, { withFileTypes: true })
  return entries
    .filter((e) => e.isDirectory())
    .filter((e) => existsSync(join(__dirname, e.name, "config.json")))
    .map((e) => e.name)
}

describe("splitByLines scenarios", () => {
  const scenarios = getScenarioNames()

  scenarios.forEach((name) => {
    it(name, () => {
      const { actual, expected } = runScenario(name)
      expect(actual).toEqual(expected)
    })
  })
})
