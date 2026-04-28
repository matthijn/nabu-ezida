import { describe, it, expect } from "vitest"
import { readdirSync, readFileSync, existsSync } from "fs"
import { join } from "path"
import { injectBoundaryComments } from "~/lib/patch/resolve/json-boundary"
import { toResponseFormat } from "~/lib/agent/client/convert"
import {
  type ContentResolver,
  partitionSources,
  buildCallList,
  buildFindCall,
  extractSourceIds,
  buildFindResultSchema,
} from "../messages"

interface SourceEntry {
  path: string
  scope: "framework" | "dimension"
}

interface ScenarioConfig {
  sources: SourceEntry[]
  target: string
}

const scenariosDir = __dirname

const getScenarioNames = (): string[] =>
  readdirSync(scenariosDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()

const readScenarioFile = (dir: string, file: string): string =>
  readFileSync(join(dir, file), "utf-8")

const buildResolver = (dir: string, entries: SourceEntry[]): ContentResolver => {
  const map = new Map(
    entries.map((e) => [e.path, injectBoundaryComments(readScenarioFile(dir, e.path))])
  )
  return (path) => map.get(path)
}

const buildRequest = (dir: string, config: ScenarioConfig) => {
  const resolve = buildResolver(dir, config.sources)
  const targetContent = readScenarioFile(dir, config.target)
  const scoped = partitionSources(config.sources)
  const calls = buildCallList(scoped)
  const source = calls[0]
  const { messages } = buildFindCall(targetContent, source, resolve)
  const validIds = extractSourceIds(source, resolve)
  const schema = buildFindResultSchema(validIds)
  const responseFormat = toResponseFormat(schema)
  return { messages, response_format: responseFormat }
}

const loadScenario = (name: string) => {
  const dir = join(scenariosDir, name)
  const config: ScenarioConfig = JSON.parse(readScenarioFile(dir, "scenario.json"))
  const expectedPath = join(dir, "expected-request.json")
  if (!existsSync(expectedPath))
    throw new Error(`Missing expected-request.json for scenario ${name}`)
  const expected = JSON.parse(readFileSync(expectedPath, "utf-8"))
  return { name, dir, config, expected }
}

const scenarios = getScenarioNames().map(loadScenario)

describe("deep-analysis find request scenarios", () => {
  it.each(scenarios)("$name", ({ dir, config, expected }) => {
    const actual = buildRequest(dir, config)
    expect(actual).toEqual(expected)
  })
})
