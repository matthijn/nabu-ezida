import { describe, it, expect, beforeEach } from "vitest"
import { readdirSync, readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { setFiles } from "~/lib/files/store"
import { createToolExecutor } from "../index"
import type { ToolCall } from "../../types"

const __dirname = dirname(fileURLToPath(import.meta.url))

type Scenario = {
  name: string
  files: Record<string, string>
  call: ToolCall
  expected: {
    status: "ok" | "error"
    outputContains?: string[]
    outputEquals?: string
  }
}

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(path, "utf-8")) as T

const loadScenarios = (): Scenario[] =>
  readdirSync(__dirname)
    .filter((name) => name.endsWith(".json"))
    .map((name) => readJson<Scenario>(join(__dirname, name)))

describe("executor scenarios", () => {
  beforeEach(() => {
    setFiles({})
  })

  const scenarios = loadScenarios()
  const executor = createToolExecutor({}, { agent: "test", instance: "test-1" })

  it.each(scenarios)("$name", async ({ files, call, expected }) => {
    setFiles(files)
    const result = await executor(call)

    expect(result.status).toBe(expected.status)

    if (expected.outputContains) {
      for (const substring of expected.outputContains) {
        expect(result.output, `output should contain "${substring}"`).toContain(substring)
      }
    }

    if (expected.outputEquals !== undefined) {
      expect(result.output).toBe(expected.outputEquals)
    }
  })
})
