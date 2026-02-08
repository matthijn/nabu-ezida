import { command, ok, err, normalizePath, isGlob, resolveFiles } from "./command"

export const tail = command({
  description: "Output last lines of file",
  usage: "tail [-n count] [file...]",
  flags: {
    "-n": { alias: "--lines", description: "number of lines (default 10)", value: true },
  },
  handler: (files) => (paths, _, stdin, flagValues) => {
    const count = parseInt(flagValues["-n"] ?? "10", 10) || 10

    if (paths.length === 0) {
      return ok(stdin.split("\n").slice(-count).join("\n"))
    }

    const resolved: string[] = []
    for (const rawPath of paths) {
      const matches = resolveFiles(files, rawPath)
      if (matches.length > 0) { resolved.push(...matches); continue }
      const path = normalizePath(rawPath)
      if (path && !isGlob(path)) return err(`tail: ${path}: No such file`)
    }

    if (resolved.length === 0) {
      return err(`tail: no matches`)
    }

    const showHeaders = resolved.length > 1
    const results = resolved.map((path) => {
      const content = files.get(path)!
      const lines = content.split("\n").slice(-count).join("\n")
      return showHeaders ? `==> ${path} <==\n${lines}` : lines
    })

    return ok(results.join("\n\n"))
  },
})
