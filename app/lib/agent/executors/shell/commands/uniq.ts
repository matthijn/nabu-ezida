import { command, ok } from "./command"

type Group = { line: string; count: number }

const groupLines = (lines: string[]): Group[] => {
  const groups: Group[] = []
  let prev: string | undefined
  let count = 0

  for (const line of lines) {
    if (line === prev) {
      count++
    } else {
      if (prev !== undefined) groups.push({ line: prev, count })
      prev = line
      count = 1
    }
  }
  if (prev !== undefined) groups.push({ line: prev, count })
  return groups
}

export const uniq = command({
  description: "Remove adjacent duplicate lines",
  usage: "uniq [-c] [-d] [-u]",
  flags: {
    "-c": { alias: "--count", description: "prefix lines with occurrence count" },
    "-d": { alias: "--repeated", description: "only print duplicates" },
    "-u": { alias: "--unique", description: "only print unique lines" },
  },
  handler: () => (_args, flags, stdin) => {
    const groups = groupLines(stdin.split("\n"))
    const showCount = flags.has("-c")
    const dupsOnly = flags.has("-d")
    const uniqOnly = flags.has("-u")

    const filtered = groups.filter((g) => {
      if (dupsOnly) return g.count > 1
      if (uniqOnly) return g.count === 1
      return true
    })

    const result = filtered.map((g) => (showCount ? `${g.count} ${g.line}` : g.line))
    return ok(result.join("\n"))
  },
})
