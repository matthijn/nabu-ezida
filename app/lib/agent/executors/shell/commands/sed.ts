import { command, ok, err } from "./command"

const parseSubstitution = (
  expr: string
): { pattern: RegExp; replacement: string } | null => {
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
    return { pattern: new RegExp(pattern, regexFlags), replacement }
  } catch {
    return null
  }
}

export const sed = command({
  description: "Stream editor (substitution only)",
  usage: "sed 's/pattern/replacement/[g]'",
  flags: {},
  handler: () => (args, _flags, stdin) => {
    const expr = args[0]
    if (!expr) return err("sed: missing expression")

    const sub = parseSubstitution(expr)
    if (!sub) {
      return err(`sed: only 's/pattern/replacement/[g]' supported`)
    }

    const lines = stdin.split("\n").map((line) =>
      line.replace(sub.pattern, sub.replacement)
    )

    return ok(lines.join("\n"))
  },
})
