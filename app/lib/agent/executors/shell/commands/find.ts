import { minimatch } from "minimatch"
import { command, ok, err, normalizePath } from "./command"

export const find = command({
  description: "Find files by name pattern",
  usage: "find [path] [-name pattern] [-iname pattern]",
  flags: {
    "-name": { description: "match filename pattern (glob)", value: true },
    "-iname": { description: "match filename pattern (case insensitive)", value: true },
  },
  handler: (files) => (args, _flags, _stdin, flagValues) => {
    const path = normalizePath(args[0])
    if (path !== undefined) {
      return err(`find: no subdirectories exist (use 'find -name' or 'find / -name')`)
    }

    const pattern = flagValues["-name"] || flagValues["-iname"] || "*"
    const nocase = Boolean(flagValues["-iname"])

    return ok([...files.keys()].filter((k) => minimatch(k, pattern, { nocase })).sort().join("\n"))
  },
})
