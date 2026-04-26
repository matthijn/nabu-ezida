import { readFileSync, mkdirSync, writeFileSync } from "node:fs"
import { basename, join, resolve } from "node:path"
import { parseArgs } from "node:util"
import { chunkLines } from "~/lib/data-blocks/chunk-lines"
import {
  CONTEXT_OVERLAP_RATIO,
  extractSection,
  extractLeadingContext,
  numberSection,
} from "~/lib/agent/tools/apply-deep-analysis/format"
import {
  buildMessages,
  buildCallList,
  buildResponseSchema,
  type ContentResolver,
} from "~/lib/agent/tools/apply-deep-analysis/messages"
import { toResponseFormat } from "~/lib/agent/client/convert"

const CHUNK_TARGET = 8000

const callerCwd = process.env.BENCH_CWD ?? process.cwd()
const toAbsolute = (p: string): string => resolve(callerCwd, p)

interface CliArgs {
  target: string
  framework: string
  dimensions: string[]
  output: string
}

const parseCli = (): CliArgs => {
  const { values } = parseArgs({
    options: {
      target: { type: "string" },
      framework: { type: "string" },
      dimension: { type: "string", multiple: true },
      output: { type: "string" },
    },
    strict: true,
  })

  if (!values.target || !values.framework || !values.output) {
    console.error(
      "Usage: bench-generate.sh --target <file> --framework <file> [--dimension <file> ...] --output <dir>"
    )
    process.exit(1)
  }

  return {
    target: toAbsolute(values.target),
    framework: toAbsolute(values.framework),
    dimensions: (values.dimension ?? []).map(toAbsolute),
    output: toAbsolute(values.output),
  }
}

const stem = (filePath: string): string => basename(filePath).replace(/\.[^.]+$/, "")

interface RequestEntry {
  chunkDir: string
  chunkIndex: number
  startLine: number
  endLine: number
  dimensionStem: string | null
  requestFile: string
}

const buildContentMap = (framework: string, dimensions: string[]): Map<string, string> => {
  const entries: [string, string][] = [
    [framework, readFileSync(framework, "utf-8")],
    ...dimensions.map((d): [string, string] => [d, readFileSync(d, "utf-8")]),
  ]
  return new Map(entries)
}

const buildResolver = (contentMap: Map<string, string>): ContentResolver => (path) =>
  contentMap.get(path)

const padIndex = (i: number): string => String(i + 1).padStart(2, "0")

const chunkDirName = (index: number, startLine: number, endLine: number): string =>
  `chunk-${padIndex(index)}-L${startLine}-L${endLine}`

const requestFileName = (dimensionPath: string | null): string =>
  dimensionPath === null ? "request.json" : `request-${stem(dimensionPath)}.json`

const run = () => {
  const args = parseCli()
  const targetContent = readFileSync(args.target, "utf-8")
  const chunks = chunkLines(targetContent, CHUNK_TARGET)
  const contentMap = buildContentMap(args.framework, args.dimensions)
  const resolve = buildResolver(contentMap)
  const calls = buildCallList({
    framework: [args.framework],
    dimension: args.dimensions,
  })
  const responseFormat = toResponseFormat(buildResponseSchema("return"))

  const targetStem = stem(args.target)
  const baseDir = join(args.output, targetStem)
  mkdirSync(baseDir, { recursive: true })

  console.log(`Target: ${basename(args.target)} (${chunks.length} chunks)`)
  console.log(`Framework: ${basename(args.framework)}`)
  if (args.dimensions.length > 0)
    console.log(`Dimensions: ${args.dimensions.map((d) => basename(d)).join(", ")}`)
  console.log("")

  const entries: RequestEntry[] = []

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const dirName = chunkDirName(i, chunk.startLine, chunk.endLine)
    const chunkDir = join(baseDir, dirName)
    mkdirSync(chunkDir, { recursive: true })

    const section = extractSection(targetContent, chunk.startLine, chunk.endLine)
    const leadingContext = extractLeadingContext(targetContent, chunk.startLine, CONTEXT_OVERLAP_RATIO)
    const { numbered, sentences } = numberSection(section)

    console.log(`  ${dirName} (${sentences.length} sentences, ${calls.length} call(s))`)

    for (const call of calls) {
      const dimensionPath = call.dimension.length > 0 ? call.dimension[0] : null
      const fileName = requestFileName(dimensionPath)
      const messages = buildMessages(numbered, call, "return", leadingContext, resolve)
      const body = { messages, response_format: responseFormat }

      const filePath = join(chunkDir, fileName)
      writeFileSync(filePath, JSON.stringify(body, null, 2))

      const dimLabel = dimensionPath !== null ? stem(dimensionPath) : "all"
      console.log(`    → ${fileName} (${dimLabel})`)

      entries.push({
        chunkDir: dirName,
        chunkIndex: i,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        dimensionStem: dimensionPath !== null ? stem(dimensionPath) : null,
        requestFile: fileName,
      })
    }
  }

  const manifest = {
    target: args.target,
    framework: args.framework,
    dimensions: args.dimensions,
    chunkTarget: CHUNK_TARGET,
    totalChunks: chunks.length,
    totalRequests: entries.length,
    entries,
  }

  writeFileSync(join(baseDir, "manifest.json"), JSON.stringify(manifest, null, 2))

  console.log(`\n${entries.length} request(s) across ${chunks.length} chunk(s) written to ${baseDir}`)
}

run()
