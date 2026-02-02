import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { toExtraPretty, fromExtraPretty, PrettyJsonError } from "./pretty"

const __dirname = dirname(fileURLToPath(import.meta.url))
const scenariosDir = join(__dirname, "scenarios")

type Scenario = {
  name: string
  storage: string
  pretty: string
}

const loadScenarios = (): Scenario[] =>
  readdirSync(scenariosDir)
    .filter((name) => {
      const path = join(scenariosDir, name)
      return readdirSync(path).includes("storage.md")
    })
    .map((name) => {
      const dir = join(scenariosDir, name)
      return {
        name,
        storage: readFileSync(join(dir, "storage.md"), "utf-8"),
        pretty: readFileSync(join(dir, "pretty.md"), "utf-8"),
      }
    })

describe("toExtraPretty", () => {
  const scenarios = loadScenarios()

  it.each(scenarios)("$name: expands multiline strings", ({ storage, pretty }) => {
    expect(toExtraPretty(storage)).toBe(pretty)
  })
})

describe("fromExtraPretty", () => {
  const scenarios = loadScenarios()

  it.each(scenarios)("$name: collapses multiline strings", ({ storage, pretty }) => {
    expect(fromExtraPretty(pretty)).toBe(storage)
  })
})

describe("roundtrip", () => {
  const scenarios = loadScenarios()

  it.each(scenarios)("$name: fromExtraPretty(toExtraPretty(x)) === x", ({ storage }) => {
    expect(fromExtraPretty(toExtraPretty(storage))).toBe(storage)
  })

  it.each(scenarios)("$name: toExtraPretty(fromExtraPretty(x)) === x", ({ pretty }) => {
    expect(toExtraPretty(fromExtraPretty(pretty))).toBe(pretty)
  })
})

describe("fromExtraPretty error handling", () => {
  const errorCases = [
    {
      name: "unclosed triple quote",
      input: '```json-callout\n{\n  "content": """\nunclosed\n}\n```',
    },
    {
      name: "triple quote without newline after",
      input: '```json-callout\n{\n  "content": """no newline"""\n}\n```',
    },
    {
      name: "unclosed code block with triple quote",
      input: '# Doc\n\n```json-callout\n{\n  "content": """\nhello',
    },
    {
      name: "unbalanced code fences",
      input: '# Doc\n\n```json-callout\n{"id": "foo"}\n```\n\n```json-callout\n{"id": "bar"}',
    },
  ]

  it.each(errorCases)("$name: throws PrettyJsonError", ({ input }) => {
    expect(() => fromExtraPretty(input)).toThrow(PrettyJsonError)
  })

  it("error message is descriptive", () => {
    const input = '```json-callout\n{\n  "content": """\nunclosed\n}\n```'
    expect(() => fromExtraPretty(input)).toThrow(/Malformed """|multiline string/)
  })

  it("no error when no triple quotes present", () => {
    const input = '```json-callout\n{\n  "id": "test",\n  "content": "simple"\n}\n```'
    expect(() => fromExtraPretty(input)).not.toThrow()
  })

  it("handles whitespace around closing triple quote", () => {
    const input = '```json-callout\n{\n  "content": """\nhello\n  """\n}\n```'
    expect(() => fromExtraPretty(input)).not.toThrow()
  })
})
