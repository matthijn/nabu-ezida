import type { Files } from "./types"
import * as commands from "./commands"

export type { Files }

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

  const exec = (input: string): string => {
    const trimmed = input.trim().replace(/\s*2>\/dev\/null\s*/g, " ")

    if (!trimmed.trim()) return ""
    if (trimmed.trim() === "help") return helpText()

    const unsupported = trimmed.match(/\|\||>>|>|<|`|\$\(/)
    if (unsupported) {
      return `Unsupported operator: '${unsupported[0]}'\nSupported: | && ;`
    }

    const statements = trimmed.split(/\s*(?:&&|;)\s*/).filter(Boolean)
    const outputs: string[] = []

    for (const stmt of statements) {
      const pipeline = stmt
        .split(/\s*\|\s*/)
        .map((s) => s.trim())
        .filter(Boolean)

      let output = ""
      for (const cmd of pipeline) {
        const tokens = cmd.match(/(?:[^\s"]+|"[^"]*")+/g) || []
        const [name, ...args] = tokens.map((t) => t.replace(/^"|"$/g, ""))

        if (!name) continue

        const handler = handlers[name]
        if (!handler) {
          return `Unknown command: '${name}'\n\nAvailable commands:\n${helpText()}`
        }

        output = handler(args, output)

        if (
          output.startsWith("Unsupported option:") ||
          output.includes("No such file")
        ) {
          return output
        }
      }
      outputs.push(output)
    }

    return outputs.join("\n")
  }

  return { exec, commands: handlers, helpText }
}
