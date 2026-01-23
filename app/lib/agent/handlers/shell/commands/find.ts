import { minimatch } from "minimatch"
import { command } from "./command"

export const find = command({
  description: "Find files by name pattern",
  usage: "find [-name pattern]",
  flags: {
    "-name": { description: "match filename pattern (glob)", value: true },
  },
  handler: (files) => (_args, _flags, _stdin, flagValues) => {
    const pattern = flagValues["-name"] || "*"

    return [...files.keys()]
      .filter((k) => minimatch(k, pattern))
      .sort()
      .join("\n")
  },
})
