import { command, ok } from "./command"

export const uniq = command({
  description: "Remove adjacent duplicate lines",
  usage: "uniq [-c]",
  flags: {
    "-c": { description: "prefix lines with occurrence count" },
  },
  handler: () => (_args, flags, stdin) => {
    const lines = stdin.split("\n")
    const result: string[] = []
    let prev: string | undefined
    let count = 0

    for (const line of lines) {
      if (line === prev) {
        count++
      } else {
        if (prev !== undefined) {
          result.push(flags.has("-c") ? `${count} ${prev}` : prev)
        }
        prev = line
        count = 1
      }
    }
    if (prev !== undefined) {
      result.push(flags.has("-c") ? `${count} ${prev}` : prev)
    }

    return ok(result.join("\n"))
  },
})
