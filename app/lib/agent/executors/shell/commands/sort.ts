import { command, ok } from "./command"

export const sort = command({
  description: "Sort lines",
  usage: "sort [-u] [-r] [-n]",
  flags: {
    "-u": { description: "unique - remove duplicates" },
    "-r": { description: "reverse order" },
    "-n": { description: "numeric sort" },
  },
  handler: () => (_args, flags, stdin) => {
    let lines = stdin.split("\n").filter((l) => l !== "")

    const numeric = flags.has("-n")
    lines.sort((a, b) => (numeric ? parseFloat(a) - parseFloat(b) : a.localeCompare(b)))

    if (flags.has("-r")) lines.reverse()
    if (flags.has("-u")) lines = [...new Set(lines)]

    return ok(lines.join("\n"))
  },
})
