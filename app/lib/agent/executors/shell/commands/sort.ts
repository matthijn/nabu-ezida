import { command, ok } from "./command"

const getField = (line: string, field: number, delim: string): string => {
  const parts = line.split(delim)
  return parts[field - 1] ?? ""
}

export const sort = command({
  description: "Sort lines",
  usage: "sort [-u] [-r] [-n] [-k field] [-t delim]",
  flags: {
    "-u": { alias: "--unique", description: "unique - remove duplicates" },
    "-r": { alias: "--reverse", description: "reverse order" },
    "-n": { alias: "--numeric-sort", description: "numeric sort" },
    "-k": { alias: "--key", description: "sort by field number (1-indexed)", value: true },
    "-t": { alias: "--field-separator", description: "field delimiter", value: true },
  },
  handler: () => (_args, flags, stdin, flagValues) => {
    let lines = stdin.split("\n").filter((l) => l !== "")

    const numeric = flags.has("-n")
    const field = parseInt(flagValues["-k"] ?? "0", 10)
    const delim = flagValues["-t"] ?? /\s+/

    const getValue = (line: string): string | number => {
      const val = field > 0 ? getField(line, field, typeof delim === "string" ? delim : " ") : line
      return numeric ? parseFloat(val) || 0 : val
    }

    lines.sort((a, b) => {
      const va = getValue(a)
      const vb = getValue(b)
      if (typeof va === "number" && typeof vb === "number") return va - vb
      return String(va).localeCompare(String(vb))
    })

    if (flags.has("-r")) lines.reverse()
    if (flags.has("-u")) lines = [...new Set(lines)]

    return ok(lines.join("\n"))
  },
})
