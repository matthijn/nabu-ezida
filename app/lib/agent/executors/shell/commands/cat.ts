import { command, ok, err } from "./command"

export const cat = command({
  description: "Print file contents",
  usage: "cat [-n] [-o offset] [-l limit] <file>",
  flags: {
    "-n": { description: "number output lines" },
    "-o": { description: "start at line (default 1)", value: true },
    "-l": { description: "max lines to show", value: true },
  },
  handler: (files) => (paths, flags, stdin, flagValues) => {
    const offset = parseInt(flagValues["-o"] ?? "1", 10) || 1
    const limit = flagValues["-l"] ? parseInt(flagValues["-l"], 10) : null

    const filename = paths[0]
    if (filename && !files.has(filename)) {
      return err(`cat: ${filename}: No such file`)
    }

    const content = filename ? files.get(filename)! : stdin

    let lines = content.split("\n")
    lines = lines.slice(offset - 1)
    if (limit !== null) lines = lines.slice(0, limit)

    if (flags.has("-n")) {
      return ok(lines.map((line, i) => `${String(offset + i).padStart(6)}\t${line}`).join("\n"))
    }

    return ok(lines.join("\n"))
  },
})
