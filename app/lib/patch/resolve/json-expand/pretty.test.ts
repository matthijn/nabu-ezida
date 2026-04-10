import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import { toExtraPretty, fromExtraPretty, PrettyJsonError } from "./pretty"

const __dirname = dirname(fileURLToPath(import.meta.url))
const scenariosDir = join(__dirname, "scenarios")

interface Scenario {
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

describe("doubled triple quotes", () => {
  const cases: { name: string; input: string; expected: string }[] = [
    {
      name: "collapses doubled opening and closing markers",
      input:
        '```json-chart\n{\n\t"tooltip": """\n"""\n**{year}**\nCount: {count}\n"""\n"""\n}\n```',
      expected: '```json-chart\n{\n\t"tooltip": "**{year}**\\nCount: {count}"\n}\n```',
    },
    {
      name: "handles tripled markers",
      input: '```json-chart\n{\n\t"tooltip": """\n"""\n"""\nhello\n"""\n"""\n"""\n}\n```',
      expected: '```json-chart\n{\n\t"tooltip": "hello"\n}\n```',
    },
    {
      name: "preserves valid single markers",
      input: '```json-chart\n{\n\t"tooltip": """\nhello\n"""\n}\n```',
      expected: '```json-chart\n{\n\t"tooltip": "hello"\n}\n```',
    },
  ]

  it.each(cases)("$name", ({ input, expected }) => {
    expect(fromExtraPretty(input)).toBe(expected)
  })
})

describe("fromExtraPretty error handling", () => {
  const cases: { name: string; input: string; throws: true | false | RegExp }[] = [
    {
      name: "unclosed triple quote",
      input: '```json-callout\n{\n  "content": """\nunclosed\n}\n```',
      throws: true,
    },
    {
      name: "triple quote without newline after",
      input: '```json-callout\n{\n  "content": """no newline"""\n}\n```',
      throws: true,
    },
    {
      name: "unclosed code block with triple quote",
      input: '# Doc\n\n```json-callout\n{\n  "content": """\nhello',
      throws: true,
    },
    {
      name: "unbalanced code fences",
      input: '# Doc\n\n```json-callout\n{"id": "foo"}\n```\n\n```json-callout\n{"id": "bar"}',
      throws: true,
    },
    {
      name: "error message is descriptive",
      input: '```json-callout\n{\n  "content": """\nunclosed\n}\n```',
      throws: /Malformed """|multiline string/,
    },
    {
      name: "no error when no triple quotes present",
      input: '```json-callout\n{\n  "id": "test",\n  "content": "simple"\n}\n```',
      throws: false,
    },
    {
      name: "handles whitespace around closing triple quote",
      input: '```json-callout\n{\n  "content": """\nhello\n  """\n}\n```',
      throws: false,
    },
  ]

  it.each(cases)("$name", ({ input, throws }) => {
    const run = () => fromExtraPretty(input)
    if (throws === true) expect(run).toThrow(PrettyJsonError)
    else if (throws === false) expect(run).not.toThrow()
    else expect(run).toThrow(throws)
  })
})
