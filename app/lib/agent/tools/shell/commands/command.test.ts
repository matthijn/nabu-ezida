import { describe, it, expect } from "vitest"
import { resolveFiles } from "./command"

const testFiles = new Map([
  ["src/app.ts", "app content"],
  ["src/util.ts", "util content"],
  ["docs/readme.md", "readme"],
  ["config.json", "{}"],
])

describe("resolveFiles", () => {
  const cases = [
    { name: "exact match", pattern: "src/app.ts", expected: ["src/app.ts"] },
    { name: "exact miss", pattern: "src/missing.ts", expected: [] },
    { name: "glob match", pattern: "src/*.ts", expected: ["src/app.ts", "src/util.ts"] },
    { name: "glob miss", pattern: "src/*.js", expected: [] },
    { name: "glob all md", pattern: "**/*.md", expected: ["docs/readme.md"] },
    { name: "strips ./ prefix", pattern: "./src/app.ts", expected: ["src/app.ts"] },
    { name: "strips / prefix", pattern: "/src/app.ts", expected: ["src/app.ts"] },
    { name: "dot returns empty", pattern: ".", expected: [] },
    { name: "./ returns empty", pattern: "./", expected: [] },
    { name: "/ returns empty", pattern: "/", expected: [] },
    { name: "glob with ./ prefix", pattern: "./src/*.ts", expected: ["src/app.ts", "src/util.ts"] },
  ]

  it.each(cases)("$name: $pattern", ({ pattern, expected }) => {
    expect(resolveFiles(testFiles, pattern)).toEqual(expected)
  })
})
