import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { upsertHandler, removeHandler } from "../tool"

const __dirname = dirname(fileURLToPath(import.meta.url))

type UpsertScenario = {
  type: "upsert"
  files: Record<string, string>
  args: {
    path: string
    annotations: { text: string; reason: string; color?: string; code?: string }[]
  }
  expected: {
    status: "ok" | "partial" | "error"
    output: string
    message?: string
  }
}

type RemoveScenario = {
  type: "remove"
  files: Record<string, string>
  args: {
    path: string
    texts: string[]
  }
  expected: {
    status: "ok" | "partial" | "error"
    output: string
    message?: string
  }
}

type Scenario = UpsertScenario | RemoveScenario

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(path, "utf-8")) as T

const loadScenarios = (): { name: string; scenario: Scenario }[] =>
  readdirSync(__dirname)
    .filter((name) => name.endsWith(".json"))
    .map((name) => ({
      name: name.replace(".json", ""),
      scenario: readJson<Scenario>(join(__dirname, name)),
    }))

describe("annotation handler scenarios", () => {
  const scenarios = loadScenarios()

  it.each(scenarios)("$name", async ({ scenario }) => {
    const files = new Map(Object.entries(scenario.files))

    const result = scenario.type === "upsert"
      ? await upsertHandler(files, scenario.args)
      : await removeHandler(files, scenario.args)

    expect(result.status).toBe(scenario.expected.status)
    expect(result.output).toContain(scenario.expected.output)
    if (scenario.expected.message) {
      expect(result.message).toContain(scenario.expected.message)
    }
  })
})
