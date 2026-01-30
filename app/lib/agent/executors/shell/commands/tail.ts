import { command, ok, err, normalizePath } from "./command"

export const tail = command({
  description: "Output last lines of file",
  usage: "tail [-n count] [file]",
  flags: {
    "-n": { alias: "--lines", description: "number of lines (default 10)", value: true },
  },
  handler: (files) => (paths, _, stdin, flagValues) => {
    const count = parseInt(flagValues["-n"] ?? "10", 10) || 10

    const filename = normalizePath(paths[0])
    if (filename && !files.has(filename)) {
      return err(`tail: ${filename}: No such file`)
    }

    const content = filename ? files.get(filename)! : stdin
    return ok(content.split("\n").slice(-count).join("\n"))
  },
})
