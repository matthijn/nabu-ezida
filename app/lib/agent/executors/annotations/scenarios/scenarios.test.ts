import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync, existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { upsertHandler, removeHandler } from "../tool"
import type { Operation } from "~/lib/agent/types"
import { applyDiff } from "~/lib/diff/parse"

const __dirname = dirname(fileURLToPath(import.meta.url))

type ExpectedResult = {
  status: "ok" | "partial" | "error"
  output: string
  message?: string
}

type UpsertScenario = {
  type: "upsert"
  files?: Record<string, string>
  args: {
    path: string
    annotations: { text: string; reason: string; color?: string; code?: string }[]
  }
  expected: ExpectedResult
}

type RemoveScenario = {
  type: "remove"
  files?: Record<string, string>
  args: {
    path: string
    texts: string[]
  }
  expected: ExpectedResult
}

type Scenario = UpsertScenario | RemoveScenario

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(path, "utf-8")) as T

const tryReadFile = (path: string): string | null =>
  existsSync(path) ? readFileSync(path, "utf-8") : null

const loadScenarios = (): { name: string; scenario: Scenario; inputDoc: string | null; expectedDoc: string | null }[] =>
  readdirSync(__dirname)
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      const baseName = name.replace(".json", "")
      return {
        name: baseName,
        scenario: readJson<Scenario>(join(__dirname, name)),
        inputDoc: tryReadFile(join(__dirname, `${baseName}.input.md`)),
        expectedDoc: tryReadFile(join(__dirname, `${baseName}.expected.md`)),
      }
    })

const applyMutations = (files: Map<string, string>, mutations: Operation[]): Map<string, string> => {
  const result = new Map(files)
  for (const m of mutations) {
    if (m.type === "update_file") {
      const content = result.get(m.path) ?? ""
      const applied = applyDiff(content, m.diff)
      if (applied.ok) {
        result.set(m.path, applied.content)
      }
    }
  }
  return result
}

describe("annotation handler scenarios", () => {
  const scenarios = loadScenarios()

  it.each(scenarios)("$name", async ({ scenario, inputDoc, expectedDoc }) => {
    const filesObj = inputDoc !== null
      ? { [scenario.args.path]: inputDoc }
      : scenario.files ?? {}
    const files = new Map(Object.entries(filesObj))

    const result = scenario.type === "upsert"
      ? await upsertHandler(files, scenario.args)
      : await removeHandler(files, scenario.args)

    expect(result.status).toBe(scenario.expected.status)
    expect(result.output).toContain(scenario.expected.output)
    if (scenario.expected.message) {
      expect(result.message).toContain(scenario.expected.message)
    }

    if (expectedDoc !== null) {
      const resultFiles = applyMutations(files, result.mutations)
      expect(resultFiles.get(scenario.args.path)).toBe(expectedDoc)
    }
  })
})
