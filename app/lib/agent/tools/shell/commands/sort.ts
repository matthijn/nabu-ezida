import { command, ok, err, normalizePath, isGlob } from "./command"

export const sort = command({
  description: "Sort lines",
  usage: "sort [-r] [-n] [-u] [file]",
  flags: {
    "-r": { alias: "--reverse", description: "reverse order" },
    "-n": { alias: "--numeric-sort", description: "numeric sort" },
    "-u": { alias: "--unique", description: "deduplicate lines" },
  },
  handler: (files) => (paths, flags, stdin) => {
    const filename = normalizePath(paths[0])
    if (filename && isGlob(filename)) return err("sort: globs not supported")
    if (filename && !files.has(filename)) return err(`sort: ${filename}: No such file`)

    const content = filename ? (files.get(filename) ?? "") : stdin
    let lines = content.split("\n")

    if (flags.has("-u")) lines = [...new Set(lines)]

    const compare = flags.has("-n")
      ? (a: string, b: string) => parseFloat(a) - parseFloat(b)
      : (a: string, b: string) => a.localeCompare(b)

    lines.sort(compare)
    if (flags.has("-r")) lines.reverse()

    return ok(lines.join("\n"))
  },
})
