import { readdirSync, readFileSync, writeFileSync, existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"
import type { Block } from "../../../types"
import { nudge } from "../index"

const __dirname = dirname(fileURLToPath(import.meta.url))

type Files = Record<string, string>

const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(path, "utf-8")) as T

const readFilesJson = (path: string): Files => {
  if (!existsSync(path)) return {}
  return readJson<Files>(path)
}

const shouldNudge = (block: Block): boolean =>
  block.type === "user" || block.type === "tool_result"

const regenerateScenario = async (name: string): Promise<void> => {
  const basePath = join(__dirname, name, name)
  const input = readJson<Block[]>(`${basePath}.json`)
  const files = readFilesJson(`${basePath}.files.json`)

  const history: Block[] = []
  for (const block of input) {
    history.push(block)
    if (shouldNudge(block)) {
      const nudgeBlocks = await nudge(history, files)
      for (const n of nudgeBlocks) {
        history.push(n)
      }
    }
  }

  writeFileSync(`${basePath}.expected.json`, JSON.stringify(history, null, 2) + "\n")
  console.log(`Regenerated ${name}`)
}

const getScenarioNames = (): string[] => {
  const entries = readdirSync(__dirname, { withFileTypes: true })
  return entries.filter((e) => e.isDirectory()).map((e) => e.name)
}

const main = async () => {
  const scenarios = getScenarioNames()
  for (const scenario of scenarios) {
    await regenerateScenario(scenario)
  }
  console.log(`Done. Regenerated ${scenarios.length} scenarios.`)
}

main()
