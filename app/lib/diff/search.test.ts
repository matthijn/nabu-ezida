import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync } from "fs"
import { join } from "path"
import { findMatches, getMatchedText, Match } from "./search"

type ExpectedMatch = Match & { content?: string }

type Scenario = {
  name: string
  needle: string
  expected: { matches: ExpectedMatch[] }
}

const scenariosDir = join(__dirname, "scenarios")
const content = readFileSync(join(scenariosDir, "content.md"), "utf-8")

const loadScenarios = (): Scenario[] =>
  readdirSync(scenariosDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(scenariosDir, f), "utf-8")))

describe("findMatches", () => {
  const scenarios = loadScenarios()

  it.each(scenarios)("$name", ({ needle, expected }) => {
    const matches = findMatches(content, needle)

    expect(matches.length).toBe(expected.matches.length)

    matches.forEach((match, i) => {
      const exp = expected.matches[i]
      expect(match).toEqual({ start: exp.start, end: exp.end, fuzzy: exp.fuzzy })

      if (exp.content) {
        expect(getMatchedText(content, match)).toBe(exp.content)
      }
    })
  })
})
