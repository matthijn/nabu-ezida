import { readdirSync, readFileSync, writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
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

const scenariosDir = dirname(fileURLToPath(import.meta.url))

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

for (const name of getScenarioNames()) {
  const dir = join(scenariosDir, name)
  const config: ScenarioConfig = JSON.parse(readScenarioFile(dir, "scenario.json"))
  const resolve = buildResolver(dir, config.sources)
  const targetContent = readScenarioFile(dir, config.target)
  const scoped = partitionSources(config.sources)
  const calls = buildCallList(scoped)
  const source = calls[0]
  const { messages } = buildFindCall(targetContent, source, resolve)
  const validIds = extractSourceIds(source, resolve)
  const schema = buildFindResultSchema(validIds)
  const responseFormat = toResponseFormat(schema)
  const request = { messages, response_format: responseFormat }
  const outPath = join(dir, "expected-request.json")
  writeFileSync(outPath, JSON.stringify(request, null, 2) + "\n")
  console.log(`wrote ${outPath}`)
}
