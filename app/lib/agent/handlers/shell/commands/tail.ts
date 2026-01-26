import { command } from "./command"

export const tail = command({
  description: "Output last lines of file",
  usage: "tail [-n count] [file]",
  flags: {
    "-n": { description: "number of lines (default 10)", value: true },
  },
  handler: (files) => (paths, _, stdin, flagValues) => {
    const count = parseInt(flagValues["-n"] ?? "10", 10) || 10

    const filename = paths[0]
    const content = filename
      ? files.get(filename) ?? `tail: ${filename}: No such file`
      : stdin

    if (content.startsWith("tail:")) return content

    const lines = content.split("\n")
    return lines.slice(-count).join("\n")
  },
})
