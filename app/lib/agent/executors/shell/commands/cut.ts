import { command, ok, err } from "./command"

const parsePositions = (spec: string): number[] | null => {
  const positions: number[] = []
  for (const part of spec.split(",")) {
    const range = part.match(/^(\d+)-(\d+)$/)
    if (range) {
      const [, start, end] = range.map(Number)
      for (let i = start; i <= end; i++) positions.push(i)
    } else {
      const n = parseInt(part, 10)
      if (isNaN(n) || n < 1) return null
      positions.push(n)
    }
  }
  return positions.length > 0 ? positions : null
}

export const cut = command({
  description: "Extract fields or characters from lines",
  usage: "cut -d<delim> -f<fields> | cut -c<chars>",
  flags: {
    "-d": { alias: "--delimiter", description: "field delimiter", value: true },
    "-f": { alias: "--fields", description: "fields to extract (1-indexed)", value: true },
    "-c": { alias: "--characters", description: "character positions (1-indexed)", value: true },
  },
  handler: () => (_args, _flags, stdin, flagValues) => {
    const charSpec = flagValues["-c"]
    const fieldSpec = flagValues["-f"]

    if (charSpec) {
      const positions = parsePositions(charSpec)
      if (!positions) return err(`cut: invalid character spec: ${charSpec}`)

      const lines = stdin.split("\n").map((line) =>
        positions.map((p) => line[p - 1] ?? "").join("")
      )
      return ok(lines.join("\n"))
    }

    if (!fieldSpec) return err("cut: must specify -f or -c")

    const fields = parsePositions(fieldSpec)
    if (!fields) return err(`cut: invalid field spec: ${fieldSpec}`)

    const delim = flagValues["-d"] ?? "\t"
    const lines = stdin.split("\n").map((line) => {
      const parts = line.split(delim)
      return fields.map((f) => parts[f - 1] ?? "").join(delim)
    })

    return ok(lines.join("\n"))
  },
})
