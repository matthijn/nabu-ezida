import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { generateJsonBlockPatch } from "./patch"
import { applyDiff } from "../parse"

const __dirname = dirname(fileURLToPath(import.meta.url))
const scenariosDir = join(__dirname, "scenarios")

type Scenario = {
  name: string
  input: string
  newJson: object
  expectedOutput: string
  expectedDiff: string
}

const loadScenarios = (): Scenario[] =>
  readdirSync(scenariosDir)
    .filter((name) => {
      const path = join(scenariosDir, name)
      return readdirSync(path).includes("input.md")
    })
    .map((name) => {
      const dir = join(scenariosDir, name)
      return {
        name,
        input: readFileSync(join(dir, "input.md"), "utf-8"),
        newJson: JSON.parse(readFileSync(join(dir, "new-json.json"), "utf-8")),
        expectedOutput: readFileSync(join(dir, "expected.md"), "utf-8"),
        expectedDiff: readFileSync(join(dir, "diff.txt"), "utf-8"),
      }
    })

describe("generateJsonBlockPatch", () => {
  const scenarios = loadScenarios()

  it.each(scenarios)("$name", ({ input, newJson, expectedOutput, expectedDiff }) => {
    const patchResult = generateJsonBlockPatch(input, "json-attributes", newJson)

    expect(patchResult.ok).toBe(true)
    if (!patchResult.ok) return

    expect(patchResult.patch.trim()).toBe(expectedDiff.trim())

    const applyResult = applyDiff(input, patchResult.patch)

    expect(applyResult.ok).toBe(true)
    if (applyResult.ok) {
      expect(applyResult.content.trim()).toBe(expectedOutput.trim())
    }
  })
})
