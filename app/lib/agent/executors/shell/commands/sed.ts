import { command, ok, err, normalizePath } from "./command"

type Address =
  | { type: "all" }
  | { type: "line"; n: number }
  | { type: "range"; start: number; end: number }
  | { type: "regex"; pattern: RegExp }

type Operation =
  | { type: "sub"; pattern: RegExp; replacement: string }
  | { type: "print" }
  | { type: "delete" }

type SedExpr = { address: Address; op: Operation }

const matchesAddress = (addr: Address, lineNum: number, line: string): boolean => {
  switch (addr.type) {
    case "all": return true
    case "line": return lineNum === addr.n
    case "range": return lineNum >= addr.start && lineNum <= addr.end
    case "regex": return addr.pattern.test(line)
    default: throw new Error(`unknown address type: ${(addr as Address).type}`)
  }
}

const parseAddress = (expr: string): { address: Address; rest: string } | null => {
  const rangeMatch = expr.match(/^(\d+),(\d+)/)
  if (rangeMatch) {
    return {
      address: { type: "range", start: parseInt(rangeMatch[1], 10), end: parseInt(rangeMatch[2], 10) },
      rest: expr.slice(rangeMatch[0].length),
    }
  }

  const lineMatch = expr.match(/^(\d+)/)
  if (lineMatch) {
    return {
      address: { type: "line", n: parseInt(lineMatch[1], 10) },
      rest: expr.slice(lineMatch[0].length),
    }
  }

  if (expr.startsWith("/")) {
    const end = expr.indexOf("/", 1)
    if (end === -1) return null
    try {
      return {
        address: { type: "regex", pattern: new RegExp(expr.slice(1, end)) },
        rest: expr.slice(end + 1),
      }
    } catch {
      return null
    }
  }

  return null
}

const parseSubstitution = (expr: string): Operation | null => {
  if (!expr.startsWith("s")) return null

  const delim = expr[1]
  if (!delim) return null

  const parts = expr.slice(2).split(delim)
  if (parts.length < 2) return null

  const flags = parts[2] ?? ""
  const regexFlags = flags.includes("i") ? "gi" : flags.includes("g") ? "g" : ""

  try {
    return { type: "sub", pattern: new RegExp(parts[0], regexFlags), replacement: parts[1] }
  } catch {
    return null
  }
}

const parseOperation = (expr: string): Operation | null => {
  if (expr === "d") return { type: "delete" }
  if (expr === "p") return { type: "print" }
  return parseSubstitution(expr)
}

const parseExpr = (expr: string): SedExpr | null => {
  const addrResult = parseAddress(expr)
  if (addrResult) {
    const op = parseOperation(addrResult.rest)
    if (!op) return null
    return { address: addrResult.address, op }
  }

  const op = parseOperation(expr)
  if (!op) return null
  return { address: { type: "all" }, op }
}

const applyExpr = (sedExpr: SedExpr, lines: string[], suppress: boolean): string[] => {
  const { address, op } = sedExpr
  const output: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1
    const line = lines[i]
    const matches = matchesAddress(address, lineNum, line)

    switch (op.type) {
      case "delete":
        if (!matches) output.push(line)
        break
      case "print":
        if (!suppress) output.push(line)
        if (matches) output.push(line)
        break
      case "sub":
        output.push(matches ? line.replace(op.pattern, op.replacement) : line)
        break
      default:
        throw new Error(`unknown op type: ${(op as Operation).type}`)
    }
  }

  return output
}

export const sed = command({
  description: "Stream editor (substitution, deletion, line printing)",
  usage: "sed [-n] '[addr]s/pat/repl/[g]' | sed [-n] '[addr]d' | sed -n '[addr]p'",
  flags: {
    "-n": { description: "suppress automatic printing" },
  },
  handler: (files) => (args, flags, stdin) => {
    const expr = args[0]
    if (!expr) return err("sed: missing expression")

    const parsed = parseExpr(expr)
    if (!parsed) {
      return err("sed: unsupported expression. Use '[addr]s/pat/repl/[g]', '[addr]d', or '-n [addr]p'. Addr: N, N,M, or /regex/")
    }

    const filename = normalizePath(args[1])
    if (filename && !files.has(filename)) {
      return err(`sed: ${filename}: No such file`)
    }
    const content = filename ? files.get(filename)! : stdin
    const lines = content.split("\n")
    const suppress = flags.has("-n")

    if (parsed.op.type === "print" && !suppress) {
      return err("sed: print command requires -n flag")
    }

    const result = applyExpr(parsed, lines, suppress)
    return ok(result.join("\n"))
  },
})
