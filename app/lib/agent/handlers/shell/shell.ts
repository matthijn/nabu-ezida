import type { Files } from "./types"
import type { Result } from "./commands/command"
import * as commands from "./commands"

export type { Files }

type Segment = { cmd: string; nextOp: "&&" | "||" | ";" | null }

const parseSegments = (input: string): Segment[] => {
  const segments: Segment[] = []
  const re = /\s*(&&|\|\||;)\s*/g
  let lastIndex = 0
  let match

  while ((match = re.exec(input)) !== null) {
    const cmd = input.slice(lastIndex, match.index).trim()
    if (cmd) segments.push({ cmd, nextOp: match[1] as "&&" | "||" | ";" })
    lastIndex = re.lastIndex
  }

  const remaining = input.slice(lastIndex).trim()
  if (remaining) segments.push({ cmd: remaining, nextOp: null })

  return segments
}

export const createShell = (files: Files) => {
  const handlers = Object.fromEntries(
    Object.entries(commands).map(([name, cmd]) => [name, cmd.createHandler(files)])
  )

  const helpText = (): string =>
    Object.entries(commands)
      .map(([name, cmd]) => {
        const flagList = Object.entries(cmd.flags)
          .map(([f, { description }]) => `    ${f}: ${description}`)
          .join("\n")
        return `${name} - ${cmd.description}\n  Usage: ${cmd.usage}\n${flagList || "    (no flags)"}`
      })
      .join("\n\n")

  const runPipeline = (stmt: string, stdin: string): Result => {
    const pipeline = stmt.split(/\s*\|\s*/).map((s) => s.trim()).filter(Boolean)
    let output = stdin

    for (const cmd of pipeline) {
      const tokens = cmd.match(/(?:[^\s"]+|"[^"]*")+/g) || []
      const [name, ...args] = tokens.map((t) => t.replace(/^"|"$/g, ""))

      if (!name) continue

      const handler = handlers[name]
      if (!handler) {
        return { output: "", error: `Unknown command: '${name}'\n\nAvailable commands:\n${helpText()}` }
      }

      const result = handler(args, output)
      if (result.error) return result
      output = result.output
    }

    return { output }
  }

  const exec = (input: string): string => {
    const trimmed = input.trim().replace(/\s*2>\/dev\/null\s*/g, " ")

    if (!trimmed) return ""
    if (trimmed === "help") return helpText()

    const unsupported = trimmed.match(/>>|>|<|`|\$\(/)
    if (unsupported) {
      return `Unsupported operator: '${unsupported[0]}'\nSupported: | && || ;`
    }

    const segments = parseSegments(trimmed)
    const outputs: string[] = []
    let lastSuccess = true

    for (let i = 0; i < segments.length; i++) {
      const { cmd, nextOp } = segments[i]
      const prevOp = i > 0 ? segments[i - 1].nextOp : null

      const shouldRun =
        prevOp === null ||
        prevOp === ";" ||
        (prevOp === "&&" && lastSuccess) ||
        (prevOp === "||" && !lastSuccess)

      if (!shouldRun) continue

      const result = runPipeline(cmd, "")
      lastSuccess = !result.error
      outputs.push(result.error ?? result.output)
    }

    return outputs.join("\n")
  }

  return { exec, commands: handlers, helpText }
}
