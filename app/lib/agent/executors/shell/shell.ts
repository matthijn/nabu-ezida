import type { Files } from "./types"
import type { Result, Operation } from "./commands/command"
import * as commands from "./commands"

export type { Files, Operation }

export type ExecResult = { output: string; operations: Operation[]; isError: boolean }

export const createShell = (files: Files) => {
  const handlers = Object.fromEntries(
    Object.entries(commands).map(([name, cmd]) => [name, cmd.createHandler(files)])
  )

  return { exec: exec(handlers), commands: handlers, helpText: helpText }
}

type CommandCategory = { name: string; commands: string[] }

const categories: CommandCategory[] = [
  { name: "Read", commands: ["cat", "head", "tail", "ls", "grep", "find", "wc"] },
  { name: "Text Processing", commands: ["cut", "sort", "uniq", "tr", "sed", "echo"] },
  { name: "File Operations", commands: ["cp", "mv", "rm", "touch"] },
]

export const getCommandNames = (): string[] =>
  categories.flatMap((c) => c.commands)

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

Simplified virtual shell. Only the commands listed below are available — unlisted commands will fail.

${sections.join("\n\n")}

### Operators

- \`|\` — Pipe output
- \`&&\` — Run if previous succeeded
- \`||\` — Run if previous failed
- \`;\` — Run regardless

### Limitations

- **Flat filesystem**: No subdirectories. Paths \`/\`, \`.\`, \`./\` all refer to root.
- **File-level writes only**: cp, mv, rm, touch operate on whole files. For editing content, use \`apply_local_patch\`
- **No redirects**: \`>\`, \`>>\`, \`<\` not supported
- **No variables**: \`$VAR\`, \`$(cmd)\` not supported`
}

type Segment = { cmd: string; nextOp: "&&" | "||" | ";" | null }

const helpText = (): string =>
  Object.entries(commands)
    .map(([name, cmd]) => {
      const flagList = Object.entries(cmd.flags)
        .map(([f, { description }]) => `    ${f}: ${description}`)
        .join("\n")
      return `${name} - ${cmd.description}\n  Usage: ${cmd.usage}\n${flagList || "    (no flags)"}`
    })
    .join("\n\n")

type SplitResult = { parts: string[]; separators: string[] }

const splitOutsideQuotes = (input: string, pattern: RegExp): SplitResult => {
  const parts: string[] = []
  const separators: string[] = []
  let current = ""
  let i = 0
  let inQuote: string | null = null

  while (i < input.length) {
    const char = input[i]

    if (!inQuote && (char === '"' || char === "'")) {
      inQuote = char
      current += char
      i++
      continue
    }
    if (char === inQuote) {
      inQuote = null
      current += char
      i++
      continue
    }
    if (inQuote) {
      current += char
      i++
      continue
    }

    const remaining = input.slice(i)
    const match = remaining.match(pattern)
    if (match && match.index === 0) {
      parts.push(current.trim())
      separators.push(match[1] ?? match[0].trim())
      current = ""
      i += match[0].length
      continue
    }

    current += char
    i++
  }

  if (current.trim()) parts.push(current.trim())
  return { parts, separators }
}

const parseSegments = (input: string): Segment[] => {
  const { parts, separators } = splitOutsideQuotes(input, /^(\s*(&&|\|\||;)\s*)/)
  return parts.map((cmd, i) => ({
    cmd,
    nextOp: (separators[i]?.trim() as "&&" | "||" | ";" | undefined) ?? null,
  }))
}

const exec = (handlers: Record<string, (args: string[], stdin: string) => Result>) => (input: string): ExecResult => {
  const trimmed = input.trim().replace(/\s*2>\/dev\/null\s*/g, " ")

  if (!trimmed) return { output: "", operations: [], isError: false }
  if (trimmed === "help") return { output: helpText(), operations: [], isError: false }

  const unsupported = trimmed.match(/>>|>|<|\$\(/)
  if (unsupported) {
    return { output: `Unsupported operator: '${unsupported[0]}'\nSupported: | && || ;`, operations: [], isError: true }
  }

  const segments = parseSegments(trimmed)
  const outputs: string[] = []
  const operations: Operation[] = []
  let lastSuccess = true
  let hasError = false

  for (let i = 0; i < segments.length; i++) {
    const { cmd, nextOp } = segments[i]
    const prevOp = i > 0 ? segments[i - 1].nextOp : null

    const shouldRun =
      prevOp === null ||
      prevOp === ";" ||
      (prevOp === "&&" && lastSuccess) ||
      (prevOp === "||" && !lastSuccess)

    if (!shouldRun) continue

    const result = runPipeline(handlers, cmd, "")
    if (result.operations) operations.push(...result.operations)
    lastSuccess = !result.error
    if (result.error) hasError = true
    outputs.push(result.error ?? result.output)
  }

  return { output: outputs.join("\n"), operations, isError: hasError }
}

const runPipeline = (handlers: Record<string, (args: string[], stdin: string) => Result>, stmt: string, stdin: string): Result => {
  const { parts: pipeline } = splitOutsideQuotes(stmt, /^(\s*\|(?!\|)\s*)/)
  let output = stdin
  const operations: Operation[] = []

  for (const cmd of pipeline) {
    const tokens = cmd.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || []
    const [name, ...args] = tokens.map((t) => t.replace(/^["']|["']$/g, ""))

    if (!name) continue

    const handler = handlers[name]
    if (!handler) {
      return { output: "", error: `Unknown command: '${name}'\n\nAvailable commands:\n${helpText()}` }
    }

    const result = handler(args, output)
    if (result.operations) operations.push(...result.operations)
    if (result.error) return { ...result, operations }
    output = result.output
  }

  return { output, operations: operations.length > 0 ? operations : undefined }
}
