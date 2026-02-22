import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync } from "fs"
import { join } from "path"
import { findMatches, getMatchedText, type Match } from "./search"

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

  it("matches when needle has trailing newline but content does not", () => {
    const contentNoTrailing = "# Notes"
    const needleWithTrailing = "# Notes\n"

    const matches = findMatches(contentNoTrailing, needleWithTrailing)

    expect(matches.length).toBe(1)
    expect(matches[0]).toEqual({ start: 0, end: 0, fuzzy: false })
  })

  const blankLineCases = [
    {
      name: "empty needle line matches whitespace-only content line",
      content: "heading\n   \ntext after gap",
      needle: "heading\n\ntext after gap",
      expected: { start: 0, end: 2, fuzzy: true },
    },
    {
      name: "whitespace-only needle line matches empty content line",
      content: "heading\n\ntext after gap",
      needle: "heading\n   \ntext after gap",
      expected: { start: 0, end: 2, fuzzy: true },
    },
    {
      name: "tab-only line matches empty line",
      content: "heading\n\t\t\ntext after gap",
      needle: "heading\n\ntext after gap",
      expected: { start: 0, end: 2, fuzzy: true },
    },
    {
      name: "mixed whitespace lines match each other",
      content: "heading\n  \t \ntext after gap",
      needle: "heading\n \ntext after gap",
      expected: { start: 0, end: 2, fuzzy: true },
    },
    {
      name: "blank line mismatch in multi-line block still matches",
      content: "Sarah is a senior nurse\n   \nin the emergency department",
      needle: "Sarah is a senior nurse\n\nin the emergency department",
      expected: { start: 0, end: 2, fuzzy: true },
    },
  ]

  it.each(blankLineCases)("$name", ({ content: c, needle, expected }) => {
    const matches = findMatches(c, needle)
    expect(matches.length).toBe(1)
    expect(matches[0]).toEqual(expected)
  })
})
