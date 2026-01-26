import { command } from "./command"

export const head = command({
  description: "Output first lines of file",
  usage: "head [-n count] [file]",
  flags: {
    "-n": { description: "number of lines (default 10)", value: true },
  },
  handler: (files) => (paths, _, stdin, flagValues) => {
    const count = parseInt(flagValues["-n"] ?? "10", 10) || 10

    const filename = paths[0]
    const content = filename
      ? files.get(filename) ?? `head: ${filename}: No such file`
      : stdin

    if (content.startsWith("head:")) return content

    return content.split("\n").slice(0, count).join("\n")
  },
})
