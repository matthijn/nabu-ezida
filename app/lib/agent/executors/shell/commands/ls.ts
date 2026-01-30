import { command, ok, err, normalizePath } from "./command"

export const ls = command({
  description: "List files",
  usage: "ls [-l] [-1]",
  flags: {
    "-l": { alias: "--long", description: "long format with sizes" },
    "-1": { description: "one per line (default)" },
    "-a": { alias: "--all", description: "ignored (no hidden files)" },
  },
  handler: (files) => (paths, flags, _stdin, _flagValues) => {
    const path = normalizePath(paths[0])
    if (path !== undefined) {
      return err(`ls: no subdirectories exist (use 'ls' or 'ls /')`)
    }

    const names = [...files.keys()].sort()

    if (names.length === 0) {
      return ok("")
    }

    if (flags.has("-l")) {
      return ok(names.map((name) => {
        const size = files.get(name)?.length ?? 0
        return `${String(size).padStart(8)}  ${name}`
      }).join("\n"))
    }

    return ok(names.join("\n"))
  },
})
