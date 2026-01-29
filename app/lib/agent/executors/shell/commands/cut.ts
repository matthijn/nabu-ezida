import { command, ok, err } from "./command"

export const cut = command({
  description: "Extract fields from lines",
  usage: "cut -d<delim> -f<fields>",
  flags: {
    "-d": { description: "field delimiter", value: true },
    "-f": { description: "fields to extract (1-indexed)", value: true },
  },
  handler: () => (_args, _flags, stdin, flagValues) => {
    const delim = flagValues["-d"] ?? "\t"
    const fieldSpec = flagValues["-f"]
    if (!fieldSpec) return err("cut: missing -f")

    const fields = parseFields(fieldSpec)
    if (!fields) return err(`cut: invalid field spec: ${fieldSpec}`)

    const lines = stdin.split("\n").map((line) => {
      const parts = line.split(delim)
      return fields.map((f) => parts[f - 1] ?? "").join(delim)
    })

    return ok(lines.join("\n"))
  },
})

const parseFields = (spec: string): number[] | null => {
  const fields: number[] = []
  for (const part of spec.split(",")) {
    const range = part.match(/^(\d+)-(\d+)$/)
    if (range) {
      const [, start, end] = range.map(Number)
      for (let i = start; i <= end; i++) fields.push(i)
    } else {
      const n = parseInt(part, 10)
      if (isNaN(n) || n < 1) return null
      fields.push(n)
    }
  }
  return fields.length > 0 ? fields : null
}
