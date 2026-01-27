import { command, ok, err } from "./command"

export const head = command({
  description: "Output first lines of file",
  usage: "head [-n count] [file]",
  flags: {
    "-n": { description: "number of lines (default 10)", value: true },
  },
  handler: (files) => (paths, _, stdin, flagValues) => {
    const count = parseInt(flagValues["-n"] ?? "10", 10) || 10

    const filename = paths[0]
    if (filename && !files.has(filename)) {
      return err(`head: ${filename}: No such file`)
    }

    const content = filename ? files.get(filename)! : stdin
    return ok(content.split("\n").slice(0, count).join("\n"))
  },
})
