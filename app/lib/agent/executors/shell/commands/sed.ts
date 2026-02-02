import { command, ok, err, normalizePath } from "./command"

type Substitution = { type: "sub"; pattern: RegExp; replacement: string }
type PrintRange = { type: "print"; start: number; end: number }
type SedExpr = Substitution | PrintRange

const parseSubstitution = (expr: string): Substitution | null => {
  if (!expr.startsWith("s")) return null

  const delim = expr[1]
  if (!delim) return null

  const parts = expr.slice(2).split(delim)
  if (parts.length < 2) return null

  const pattern = parts[0]
  const replacement = parts[1]
  const flags = parts[2] ?? ""

  const regexFlags = flags.includes("i") ? "gi" : flags.includes("g") ? "g" : ""

  try {
    return { type: "sub", pattern: new RegExp(pattern, regexFlags), replacement }
  } catch {
    return null
  }
}

const parsePrintRange = (expr: string): PrintRange | null => {
  const match = expr.match(/^(\d+)(?:,(\d+))?p$/)
  if (!match) return null

  const start = parseInt(match[1], 10)
  const end = match[2] ? parseInt(match[2], 10) : start

  return { type: "print", start, end }
}

const parseExpr = (expr: string): SedExpr | null =>
  parseSubstitution(expr) ?? parsePrintRange(expr)

export const sed = command({
  description: "Stream editor (substitution and line printing)",
  usage: "sed [-n] 's/pattern/replacement/[g]' [file] | sed -n 'START[,END]p' [file]",
  flags: {
    "-n": { description: "suppress automatic printing" },
  },
  handler: (files) => (args, flags, stdin) => {
    const expr = args[0]
    if (!expr) return err("sed: missing expression")

    const parsed = parseExpr(expr)
    if (!parsed) {
      return err(`sed: unsupported expression. Use 's/pat/repl/[g]' or 'N[,M]p'`)
    }

    const filename = normalizePath(args[1])
    if (filename && !files.has(filename)) {
      return err(`sed: ${filename}: No such file`)
    }
    const content = filename ? files.get(filename)! : stdin
    const lines = content.split("\n")

    if (parsed.type === "print") {
      if (!flags.has("-n")) {
        return err("sed: print command requires -n flag")
      }
      const selected = lines.slice(parsed.start - 1, parsed.end)
      return ok(selected.join("\n"))
    }

    const result = lines.map((line) => line.replace(parsed.pattern, parsed.replacement))
    return ok(result.join("\n"))
  },
})
