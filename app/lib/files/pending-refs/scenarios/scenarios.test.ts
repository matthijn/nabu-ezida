import { describe, it, expect, beforeEach } from "vitest"
import { readdirSync, readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { setFiles, getFiles, getFilesStripped, updateFileRaw } from "../../store"

const __dirname = dirname(fileURLToPath(import.meta.url))

type Step =
  | { action: "add"; path: string; content: string }
  | { action: "check"; path: string; contains?: string; notContains?: string }
  | { action: "checkStripped"; path: string; contains?: string; notContains?: string }

type Scenario = {
  name: string
  description: string
  steps: Step[]
}

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(path, "utf-8")) as T

const loadScenarios = (): Scenario[] =>
  readdirSync(__dirname)
    .filter((name) => name.endsWith(".json"))
    .map((name) => readJson<Scenario>(join(__dirname, name)))

describe("pending-ref resolution scenarios", () => {
  beforeEach(() => {
    setFiles({})
  })

  const scenarios = loadScenarios()

  it.each(scenarios)("$name", ({ steps }) => {
    for (const step of steps) {
      switch (step.action) {
        case "add":
          updateFileRaw(step.path, step.content)
          break

        case "check": {
          const content = getFiles()[step.path]
          if (step.contains) {
            expect(content, `expected "${step.path}" to contain "${step.contains}"`).toContain(step.contains)
          }
          if (step.notContains) {
            expect(content, `expected "${step.path}" to NOT contain "${step.notContains}"`).not.toContain(step.notContains)
          }
          break
        }

        case "checkStripped": {
          const content = getFilesStripped()[step.path]
          if (step.contains) {
            expect(content, `expected stripped "${step.path}" to contain "${step.contains}"`).toContain(step.contains)
          }
          if (step.notContains) {
            expect(content, `expected stripped "${step.path}" to NOT contain "${step.notContains}"`).not.toContain(step.notContains)
          }
          break
        }
      }
    }
  })
})
