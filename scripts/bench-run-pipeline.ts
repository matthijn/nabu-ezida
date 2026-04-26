import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs"
import { basename, join, resolve, dirname } from "node:path"
import { parseArgs } from "node:util"
import { spawnSync } from "node:child_process"
import { chunkLines } from "~/lib/data-blocks/chunk-lines"
import {
  CONTEXT_OVERLAP_RATIO,
  extractSection,
  extractLeadingContext,
  extractTrailingContext,
  prepareTargetContent,
  numberSection,
  type AnalysisResult,
} from "~/lib/agent/tools/apply-deep-analysis/format"
import {
  buildFindMessages,
  buildReasonMessages,
  buildReviewMessages,
  buildCallList,
  FindResultSchema,
  ReasonResultSchema,
  ReviewResultSchema,
  type ScopedSources,
  type ContentResolver,
} from "~/lib/agent/tools/apply-deep-analysis/messages"
import { toResponseFormat } from "~/lib/agent/client/convert"
import { CHARS_PER_TOKEN } from "~/lib/text/constants"
import { dropOutlier, promoteSpans, type FindResult, type PromotedSpan } from "~/lib/agent/tools/apply-deep-analysis/consensus"
import { formatCodedSection, type CodedItem } from "~/lib/agent/tools/apply-deep-analysis/present"

const CHUNK_TARGET = 8000
const FIND_RUNS = 5
const VOTE_POOL = 4

const callerCwd = process.env.BENCH_CWD ?? process.cwd()
const toAbsolute = (p: string): string => resolve(callerCwd, p)

interface CliArgs {
  target: string
  framework: string
  dimensions: string[]
  output: string
  runs: number
  model: string
  temperature: string
  reasoning: string
  chunk: number | null
}

const parseCli = (): CliArgs => {
  const { values } = parseArgs({
    options: {
      target: { type: "string" },
      framework: { type: "string" },
      dimension: { type: "string", multiple: true },
      output: { type: "string" },
      runs: { type: "string" },
      model: { type: "string" },
      temperature: { type: "string" },
      reasoning: { type: "string" },
      chunk: { type: "string" },
    },
    strict: true,
  })

  if (!values.target || !values.framework || !values.output) {
    console.error(
      "Usage: bench-run.sh --target <file> --framework <file> [--dimension <file> ...] --output <dir> [--runs N] [--model <model>] [--reasoning <effort>] [--chunk <index>]"
    )
    process.exit(1)
  }

  return {
    target: toAbsolute(values.target),
    framework: toAbsolute(values.framework),
    dimensions: (values.dimension ?? []).map(toAbsolute),
    output: toAbsolute(values.output),
    runs: values.runs ? parseInt(values.runs, 10) : 1,
    model: values.model ?? "",
    temperature: values.temperature ?? "",
    reasoning: values.reasoning ?? "",
    chunk: values.chunk ? parseInt(values.chunk, 10) : null,
  }
}

const stem = (filePath: string): string => basename(filePath).replace(/\.[^.]+$/, "")

const padIndex = (i: number): string => String(i + 1).padStart(2, "0")

const findLogosDir = (): string => {
  const scriptsDir = import.meta.dirname ?? dirname(new URL(import.meta.url).pathname)
  const theatronDir = dirname(scriptsDir)
  const logosDir = join(dirname(theatronDir), "hermes-logos")
  if (!existsSync(join(logosDir, "cmd/test"))) {
    console.error(`hermes-logos not found at ${logosDir}`)
    process.exit(1)
  }
  return logosDir
}

const loadEnvFile = (logosDir: string) => {
  const envPath = join(logosDir, ".env")
  if (!existsSync(envPath)) return
  const lines = readFileSync(envPath, "utf-8").split("\n")
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIdx = trimmed.indexOf("=")
    if (eqIdx < 0) continue
    const key = trimmed.slice(0, eqIdx)
    const val = trimmed.slice(eqIdx + 1).replace(/^["']|["']$/g, "")
    process.env[key] = val
  }
}

interface GoCallOpts {
  logosDir: string
  agent: string
  requestFile: string
  modelFlags: string[]
}

interface CallMeta {
  model: string
  reasoning: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cost: number
  durationMs: number
}

interface GoCallResult {
  ok: boolean
  text: string
  stderr: string
  meta: CallMeta | null
}

const parseMeta = (stderr: string): CallMeta | null => {
  const section = stderr.split("--- meta ---")[1]
  if (!section) return null

  const field = (pattern: RegExp): string => {
    const m = section.match(pattern)
    return m ? m[1] : ""
  }

  return {
    model: field(/model:\s*(.+)/),
    reasoning: field(/reasoning:\s*(.+)/) ?? "",
    inputTokens: parseInt(field(/input:\s*(\d+)/) || "0", 10),
    outputTokens: parseInt(field(/output:\s*(\d+)/) || "0", 10),
    totalTokens: parseInt(field(/total:\s*(\d+)/) || "0", 10),
    cost: parseFloat(field(/cost:\s*\$([0-9.]+)/) || "0"),
    durationMs: 0,
  }
}

const callGo = ({ logosDir, agent, requestFile, modelFlags }: GoCallOpts): GoCallResult => {
  const start = performance.now()
  const proc = spawnSync(
    "go",
    ["run", "./cmd/test", ...modelFlags, agent, requestFile],
    { cwd: logosDir, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024, stdio: ["pipe", "pipe", "pipe"] }
  )
  const durationMs = Math.round(performance.now() - start)

  const stdout = (proc.stdout ?? "") as string
  const stderr = (proc.stderr ?? "") as string
  const ok = proc.status === 0 || stdout.length > 0

  const meta = parseMeta(stderr)
  if (meta) meta.durationMs = durationMs

  return { ok, text: stdout, stderr, meta }
}

const tryParseJson = (text: string): unknown | undefined => {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

const buildModelFlags = (args: CliArgs): string[] => {
  const flags: string[] = []
  if (args.model) flags.push("--model", args.model)
  if (args.temperature) flags.push("--temperature", args.temperature)
  if (args.reasoning) flags.push("--reasoning", args.reasoning)
  return flags
}

const writeJson = (path: string, data: unknown) =>
  writeFileSync(path, JSON.stringify(data, null, 2))

const writeRequest = (dir: string, name: string, body: unknown): string => {
  const path = join(dir, name)
  writeJson(path, body)
  return path
}

const spanKey = (s: { start: number; end: number; analysis_source_id: string }): string =>
  `${s.start}-${s.end}-${s.analysis_source_id}`

interface RunStats {
  totalCalls: number
  successCalls: number
  failCalls: number
  callMetas: CallMeta[]
}

const runPipeline = (
  runDir: string,
  numbered: string,
  sentences: string[],
  leadingCtx: string,
  trailingCtx: string,
  call: ScopedSources,
  dimLabel: string,
  resolve: ContentResolver,
  logosDir: string,
  modelFlags: string[]
): RunStats => {
  const stats: RunStats = { totalCalls: 0, successCalls: 0, failCalls: 0, callMetas: [] }
  const dimDir = join(runDir, dimLabel)
  mkdirSync(dimDir, { recursive: true })

  const collectMeta = (result: GoCallResult) => {
    if (result.meta) stats.callMetas.push(result.meta)
  }

  const findFormat = toResponseFormat(FindResultSchema)
  const reasonFormat = toResponseFormat(ReasonResultSchema)
  const reviewFormat = toResponseFormat(ReviewResultSchema)

  const findRuns: FindResult[][] = []

  for (let r = 0; r < FIND_RUNS; r++) {
    stats.totalCalls++
    const messages = buildFindMessages(numbered, call, leadingCtx, trailingCtx, resolve)
    const body = { messages, response_format: findFormat }
    const reqPath = writeRequest(dimDir, `find-${r + 1}-request.json`, body)

    process.stdout.write(`      find ${r + 1}/${FIND_RUNS} ... `)
    const result = callGo({ logosDir, agent: "deep-analysis-find", requestFile: reqPath, modelFlags })
    collectMeta(result)

    writeFileSync(join(dimDir, `find-${r + 1}-response.txt`), result.text)
    if (result.stderr) writeFileSync(join(dimDir, `find-${r + 1}-meta.txt`), result.stderr)

    const parsed = tryParseJson(result.text)
    const validated = parsed !== undefined ? FindResultSchema.safeParse(parsed) : undefined

    if (validated?.success) {
      findRuns.push(validated.data.results)
      writeJson(join(dimDir, `find-${r + 1}-parsed.json`), validated.data.results)
      stats.successCalls++
      console.log(`ok (${validated.data.results.length} spans)`)
    } else {
      findRuns.push([])
      stats.failCalls++
      console.log("FAIL")
    }
  }

  const votingPool = dropOutlier(findRuns)
  writeJson(join(dimDir, "outlier-drop.json"), {
    dropped: findRuns.findIndex((r) => !votingPool.includes(r)),
    spanCounts: findRuns.map((r) => r.length),
  })
  const consensus = promoteSpans(votingPool, sentences.length, VOTE_POOL)
  writeJson(join(dimDir, "consensus.json"), consensus)

  const allSpans = [...consensus.certain, ...consensus.uncertain]
  console.log(`      consensus: ${consensus.certain.length} certain, ${consensus.uncertain.length} uncertain`)

  if (allSpans.length === 0) {
    console.log(`      no spans promoted, skipping reason/review`)
    return stats
  }

  const reasonItems: CodedItem[] = allSpans.map((s) => ({
    start: s.start,
    end: s.end,
    analysis_source_id: s.analysis_source_id,
  }))
  const { text: reasonPresented, mapping: reasonMapping } = formatCodedSection(sentences, reasonItems)
  writeFileSync(join(dimDir, "reason-presented.txt"), reasonPresented)
  writeJson(join(dimDir, "reason-mapping.json"), reasonMapping)

  stats.totalCalls++
  const reasonMessages = buildReasonMessages(reasonPresented, call, leadingCtx, trailingCtx, resolve)
  const reasonBody = { messages: reasonMessages, response_format: reasonFormat }
  const reasonReqPath = writeRequest(dimDir, "reason-request.json", reasonBody)

  process.stdout.write(`      reason ... `)
  const reasonResult = callGo({ logosDir, agent: "deep-analysis-reason", requestFile: reasonReqPath, modelFlags })
  collectMeta(reasonResult)

  writeFileSync(join(dimDir, "reason-response.txt"), reasonResult.text)
  if (reasonResult.stderr) writeFileSync(join(dimDir, "reason-meta.txt"), reasonResult.stderr)

  const reasons = new Map<string, string>()
  const reasonParsed = tryParseJson(reasonResult.text)
  const reasonValidated = reasonParsed !== undefined ? ReasonResultSchema.safeParse(reasonParsed) : undefined

  if (reasonValidated?.success) {
    for (const r of reasonValidated.data.results) {
      const m = reasonMapping.find((mm) => mm.index === r.item)
      if (m) reasons.set(spanKey(m), r.reason)
    }
    writeJson(join(dimDir, "reason-parsed.json"), reasonValidated.data.results)
    stats.successCalls++
    console.log(`ok (${reasonValidated.data.results.length} reasons)`)
  } else {
    stats.failCalls++
    console.log("FAIL")
  }

  const uncertainSpans = allSpans.filter((s) => s.tier === "uncertain")
  const reviews = new Map<string, string>()

  if (uncertainSpans.length > 0) {
    const reviewItems: CodedItem[] = uncertainSpans.map((s) => ({
      start: s.start,
      end: s.end,
      analysis_source_id: s.analysis_source_id,
      reason: reasons.get(spanKey(s)),
    }))
    const { text: reviewPresented, mapping: reviewMapping } = formatCodedSection(sentences, reviewItems)
    writeFileSync(join(dimDir, "review-presented.txt"), reviewPresented)
    writeJson(join(dimDir, "review-mapping.json"), reviewMapping)

    stats.totalCalls++
    const reviewMessages = buildReviewMessages(reviewPresented, call, leadingCtx, trailingCtx, resolve)
    const reviewBody = { messages: reviewMessages, response_format: reviewFormat }
    const reviewReqPath = writeRequest(dimDir, "review-request.json", reviewBody)

    process.stdout.write(`      review (${uncertainSpans.length} uncertain) ... `)
    const reviewResult = callGo({ logosDir, agent: "deep-analysis-review", requestFile: reviewReqPath, modelFlags })
    collectMeta(reviewResult)

    writeFileSync(join(dimDir, "review-response.txt"), reviewResult.text)
    if (reviewResult.stderr) writeFileSync(join(dimDir, "review-meta.txt"), reviewResult.stderr)

    const reviewParsed = tryParseJson(reviewResult.text)
    const reviewValidated = reviewParsed !== undefined ? ReviewResultSchema.safeParse(reviewParsed) : undefined

    if (reviewValidated?.success) {
      for (const r of reviewValidated.data.results) {
        const m = reviewMapping.find((mm) => mm.index === r.item)
        if (m) reviews.set(spanKey(m), r.review)
      }
      writeJson(join(dimDir, "review-parsed.json"), reviewValidated.data.results)
      stats.successCalls++
      console.log(`ok (${reviewValidated.data.results.length} reviews)`)
    } else {
      stats.failCalls++
      console.log("FAIL")
    }
  }

  const results: AnalysisResult[] = allSpans.map((s) => {
    const key = spanKey(s)
    const result: AnalysisResult = {
      start: s.start,
      end: s.end,
      analysis_source_id: s.analysis_source_id,
      reason: reasons.get(key) ?? "",
    }
    const review = reviews.get(key)
    if (review) result.review = review
    return result
  })

  writeJson(join(dimDir, "results.json"), results)
  console.log(`      → ${results.length} final result(s)`)

  return stats
}

const summarizeMetas = (metas: CallMeta[]) => ({
  model: metas[0]?.model ?? "",
  reasoning: metas[0]?.reasoning ?? "",
  calls: metas.length,
  totalInputTokens: metas.reduce((s, m) => s + m.inputTokens, 0),
  totalOutputTokens: metas.reduce((s, m) => s + m.outputTokens, 0),
  totalTokens: metas.reduce((s, m) => s + m.totalTokens, 0),
  totalCost: Math.round(metas.reduce((s, m) => s + m.cost, 0) * 10000) / 10000,
  totalDurationMs: metas.reduce((s, m) => s + m.durationMs, 0),
  perCall: metas,
})

const run = () => {
  const args = parseCli()
  const logosDir = findLogosDir()
  loadEnvFile(logosDir)
  const modelFlags = buildModelFlags(args)

  const targetContent = readFileSync(args.target, "utf-8")
  const chunks = chunkLines(targetContent, CHUNK_TARGET)
  const contentMap = new Map<string, string>([
    [args.framework, readFileSync(args.framework, "utf-8")],
    ...args.dimensions.map((d): [string, string] => [d, readFileSync(d, "utf-8")]),
  ])
  const resolve: ContentResolver = (path) => contentMap.get(path)
  const calls = buildCallList({
    framework: [args.framework],
    dimension: args.dimensions,
  })

  const targetStem = stem(args.target)
  const baseDir = join(args.output, targetStem)
  mkdirSync(baseDir, { recursive: true })

  console.log(`Target: ${basename(args.target)} (${chunks.length} chunks)`)
  console.log(`Framework: ${basename(args.framework)}`)
  if (args.dimensions.length > 0)
    console.log(`Dimensions: ${args.dimensions.map((d) => basename(d)).join(", ")}`)
  console.log(`Pipeline runs: ${args.runs} (${FIND_RUNS} find calls each)`)
  console.log(`Output: ${baseDir}`)
  console.log("")

  const chunkIndices = args.chunk !== null
    ? [args.chunk - 1]
    : Array.from({ length: chunks.length }, (_, i) => i)

  let totalCalls = 0
  let successCalls = 0
  let failCalls = 0
  const allMetas: CallMeta[] = []

  for (let pipelineRun = 1; pipelineRun <= args.runs; pipelineRun++) {
    if (args.runs > 1) console.log(`=== run ${pipelineRun}/${args.runs} ===`)

    for (const ci of chunkIndices) {
      const chunk = chunks[ci]
      if (!chunk) continue
      const chunkLabel = `chunk-${padIndex(ci)}-L${chunk.startLine}-L${chunk.endLine}`
      const chunkDir = join(baseDir, chunkLabel)
      const runTag = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
      const runDir = join(chunkDir, `run-${runTag}`)
      mkdirSync(runDir, { recursive: true })

      const rawSection = extractSection(targetContent, chunk.startLine, chunk.endLine)
      const section = prepareTargetContent(rawSection)
      const leadingCtx = prepareTargetContent(extractLeadingContext(targetContent, chunk.startLine, CONTEXT_OVERLAP_RATIO))
      const trailingCtx = prepareTargetContent(extractTrailingContext(targetContent, chunk.endLine, CONTEXT_OVERLAP_RATIO))
      const { sentences, numbered } = numberSection(section)

      if (sentences.length === 0) {
        console.log(`  ${chunkLabel}: no sentences, skipping`)
        continue
      }

      const sectionChars = section.length
      const sectionTokens = Math.ceil(sectionChars / CHARS_PER_TOKEN)
      console.log(`  ${chunkLabel} (${sentences.length} sentences, ${sectionChars} chars, ~${sectionTokens} tokens)`)
      writeJson(join(runDir, "sentences.json"), sentences)

      const runMetas: CallMeta[] = []

      for (const call of calls) {
        const dimPath = call.dimension.length > 0 ? call.dimension[0] : null
        const dimLabel = dimPath !== null ? stem(dimPath) : "all"

        console.log(`    ${dimLabel}:`)

        const stats = runPipeline(
          runDir, numbered, sentences, leadingCtx, trailingCtx,
          call, dimLabel, resolve, logosDir, modelFlags
        )
        totalCalls += stats.totalCalls
        successCalls += stats.successCalls
        failCalls += stats.failCalls
        runMetas.push(...stats.callMetas)
      }

      allMetas.push(...runMetas)
      writeJson(join(runDir, "meta.json"), summarizeMetas(runMetas))
    }

    if (args.runs > 1) console.log("")
  }

  const summary = summarizeMetas(allMetas)
  console.log(`\nDone: ${totalCalls} LLM calls, ${successCalls} succeeded, ${failCalls} failed`)
  console.log(`Cost: $${summary.totalCost} | Tokens: ${summary.totalTokens} | Duration: ${(summary.totalDurationMs / 1000).toFixed(1)}s`)
  console.log(`Output: ${baseDir}`)
}

run()
