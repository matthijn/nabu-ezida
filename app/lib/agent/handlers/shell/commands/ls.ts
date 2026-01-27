import { command, ok, err } from "./command"

export const ls = command({
  description: "List files",
  usage: "ls [-l]",
  flags: {
    "-l": { description: "long format with sizes" },
  },
  handler: (files) => (paths, flags, _stdin, _flagValues) => {
    if (paths.length > 0 && paths[0] !== "/") {
      return err(`ls: only root listing allowed, use 'ls' or 'ls /'`)
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
