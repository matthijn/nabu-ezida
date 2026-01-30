import { parse, type ParseEntry } from "shell-quote"
import type { Files } from "./types"
import type { Result, Operation } from "./commands/command"
import * as commands from "./commands"

export type { Files, Operation }

export type ExecResult = { output: string; operations: Operation[]; isError: boolean; exitCode?: number }

export const createShell = (files: Files) => {
  const handlers = Object.fromEntries(
    Object.entries(commands).map(([name, cmd]) => [name, cmd.createHandler(files)])
  )
  return { exec: exec(handlers), commands: handlers, helpText }
}

type CommandCategory = { name: string; commands: string[] }

const categories: CommandCategory[] = [
  { name: "Read", commands: ["cat", "head", "tail", "ls", "grep", "find", "wc"] },
  { name: "Text Processing", commands: ["cut", "sort", "uniq", "tr", "sed", "echo"] },
  { name: "File Operations", commands: ["cp", "mv", "rm", "touch"] },
]

export const getCommandNames = (): string[] => categories.flatMap((c) => c.commands)

const formatCommandDoc = (name: string): string => {
  const cmd = commands[name as keyof typeof commands]
  if (!cmd) return ""
  return `**${name}** — ${cmd.description}\n\`\`\`\n${cmd.usage}\n\`\`\``
}

export const getShellDocs = (): string => {
  const sections = categories.map(({ name, commands: cmds }) => {
    const docs = cmds.map(formatCommandDoc).filter(Boolean).join("\n\n")
    return `### ${name} Commands\n\n${docs}`
  })
  return `## Shell Tool

**THIS IS NOT BASH.** This is a minimal virtual shell with a fixed command set.

**YOU MUST** use only the commands listed below. **YOU MUST NOT** use:
- Control flow: \`if\`, \`then\`, \`else\`, \`fi\`, \`for\`, \`while\`, \`do\`, \`done\`, \`case\`, \`esac\`
- Shell builtins: \`set\`, \`command\`, \`test\`, \`[\`, \`[[\`, \`exit\`, \`return\`, \`export\`
- Subshells: \`$(...)\`, backticks
- Redirects: \`>\`, \`>>\`, \`<\`, \`2>&1\`
- Variables: \`$VAR\`, \`\${VAR}\`

Available commands: ${getCommandNames().join(", ")}

${sections.join("\n\n")}

### Operators

- \`|\` — Pipe output
- \`&&\` — Run if previous succeeded
- \`||\` — Run if previous failed
- \`;\` — Run regardless

### Limitations

- **Flat filesystem**: No subdirectories. Paths \`/\`, \`.\`, \`./\` all refer to root.
- **File-level writes only**: cp, mv, rm, touch operate on whole files. For editing content, use \`apply_local_patch\``
}

const helpText = (): string =>
  Object.entries(commands)
    .map(([name, cmd]) => {
      const flagList = Object.entries(cmd.flags)
        .map(([f, { description }]) => `    ${f}: ${description}`)
        .join("\n")
      return `${name} - ${cmd.description}\n  Usage: ${cmd.usage}\n${flagList || "    (no flags)"}`
    })
    .join("\n\n")

// Error helpers
const notBashError = (feature: string): string =>
  `This is not bash. '${feature}' is not supported.\nUse only: ${getCommandNames().join(", ")}`

// Operator classifications
const bashCommands = new Set(["if", "then", "else", "fi", "for", "while", "do", "done", "case", "esac", "set", "command", "test", "exit", "return", "export"])
const redirectOps = new Set([">", ">>", "<", ">&", "<("])
const sequenceOps = new Set(["&&", "||", ";"])
const unsupportedOps = new Set([";;", "|&", "&", "(", ")"])

// Token type predicates
type VarMarker = { __var: string }

const isVarMarker = (x: unknown): x is VarMarker =>
  typeof x === "object" && x !== null && "__var" in x

const isGlob = (entry: ParseEntry | VarMarker): entry is { op: "glob"; pattern: string } =>
  typeof entry === "object" && entry !== null && "op" in entry && entry.op === "glob"

const isOp = (entry: ParseEntry | VarMarker): entry is { op: string } =>
  typeof entry === "object" && entry !== null && "op" in entry && !isVarMarker(entry) && !isGlob(entry)

// Token selectors
const tokenToString = (token: ParseEntry | VarMarker): string | null =>
  typeof token === "string" ? token : isGlob(token) ? token.pattern : null

const validateToken = (token: ParseEntry | VarMarker, next?: ParseEntry | VarMarker): string | null => {
  if (isVarMarker(token)) {
    const isCommandSubst = token.__var === "" && next && isOp(next) && next.op === "("
    return isCommandSubst ? notBashError("$(") : `Variables not supported: '$${token.__var}'`
  }
  if (isOp(token)) {
    if (redirectOps.has(token.op)) return `Redirects not supported: '${token.op}'`
    if (unsupportedOps.has(token.op)) return notBashError(token.op)
  }
  return null
}

const parseInput = (input: string): { tokens: (ParseEntry | VarMarker)[]; error?: string } => {
  const tokens = parse(input, (key) => ({ __var: key }))
  for (let i = 0; i < tokens.length; i++) {
    const error = validateToken(tokens[i], tokens[i + 1])
    if (error) return { tokens: [], error }
  }
  return { tokens }
}

// Pipeline state for reduce
type PipelineAcc = { pipelines: string[][][]; ops: string[]; pipeline: string[][]; cmd: string[] }

const flushCmd = (acc: PipelineAcc): PipelineAcc =>
  acc.cmd.length > 0 ? { ...acc, pipeline: [...acc.pipeline, acc.cmd], cmd: [] } : acc

const flushPipeline = (acc: PipelineAcc): PipelineAcc => {
  const flushed = flushCmd(acc)
  return flushed.pipeline.length > 0
    ? { ...flushed, pipelines: [...flushed.pipelines, flushed.pipeline], pipeline: [] }
    : flushed
}

const splitIntoPipelines = (tokens: (ParseEntry | VarMarker)[]): { pipelines: string[][][]; ops: string[] } => {
  const initial: PipelineAcc = { pipelines: [], ops: [], pipeline: [], cmd: [] }

  const result = tokens.reduce((acc, token) => {
    if (isOp(token)) {
      if (token.op === "|") return flushCmd(acc)
      if (sequenceOps.has(token.op)) {
        const flushed = flushPipeline(acc)
        return { ...flushed, ops: [...flushed.ops, token.op] }
      }
      return acc
    }
    const str = tokenToString(token)
    return str ? { ...acc, cmd: [...acc.cmd, str] } : acc
  }, initial)

  const final = flushPipeline(result)
  return { pipelines: final.pipelines, ops: final.ops }
}

// Execution predicates
const shouldRunAfterOp = (prevOp: string | null, lastSuccess: boolean): boolean =>
  prevOp === null || prevOp === ";" || (prevOp === "&&" && lastSuccess) || (prevOp === "||" && !lastSuccess)

const exec = (handlers: Record<string, (args: string[], stdin: string) => Result>) => (input: string): ExecResult => {
  const trimmed = input.trim().replace(/\s*(2>|>)\/dev\/null\s*/g, " ")

  if (!trimmed) return { output: "", operations: [], isError: false }
  if (trimmed === "help") return { output: helpText(), operations: [], isError: false }

  const { tokens, error } = parseInput(trimmed)
  if (error) return { output: error, operations: [], isError: true }

  const { pipelines, ops } = splitIntoPipelines(tokens)

  const outputs: string[] = []
  const operations: Operation[] = []
  let lastSuccess = true
  let hasError = false
  let lastExitCode: number | undefined

  for (let i = 0; i < pipelines.length; i++) {
    const prevOp = i > 0 ? ops[i - 1] : null
    if (!shouldRunAfterOp(prevOp, lastSuccess)) continue

    const result = runPipeline(handlers, pipelines[i])
    if (result.operations) operations.push(...result.operations)
    lastSuccess = !result.error && result.exitCode !== 1
    if (result.error) hasError = true
    if (result.exitCode !== undefined) lastExitCode = result.exitCode
    outputs.push(result.error ?? result.output)
  }

  return { output: outputs.join("\n"), operations, isError: hasError, exitCode: lastExitCode }
}

const runPipeline = (handlers: Record<string, (args: string[], stdin: string) => Result>, pipeline: string[][]): Result => {
  let output = ""
  const operations: Operation[] = []

  for (const cmd of pipeline) {
    const [name, ...args] = cmd
    if (!name) continue

    if (bashCommands.has(name)) return { output: "", error: notBashError(name) }

    const handler = handlers[name]
    if (!handler) return { output: "", error: `Unknown command: '${name}'\n\nAvailable commands:\n${helpText()}` }

    const result = handler(args, output)
    if (result.operations) operations.push(...result.operations)
    if (result.error) return { ...result, operations }
    output = result.output
    if (result.exitCode !== undefined) {
      return { output, exitCode: result.exitCode, operations: operations.length > 0 ? operations : undefined }
    }
  }

  return { output, operations: operations.length > 0 ? operations : undefined }
}
