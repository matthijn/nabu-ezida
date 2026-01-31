import { command, ok, err, normalizePath, isGlob, expandGlob } from "./command"

export const head = command({
  description: "Output first lines of file",
  usage: "head [-n count] [file...]",
  flags: {
    "-n": { alias: "--lines", description: "number of lines (default 10)", value: true },
  },
  handler: (files) => (paths, _, stdin, flagValues) => {
    const count = parseInt(flagValues["-n"] ?? "10", 10) || 10

    if (paths.length === 0) {
      return ok(stdin.split("\n").slice(0, count).join("\n"))
    }

    const resolvedFiles: string[] = []
    for (const rawPath of paths) {
      const path = normalizePath(rawPath)
      if (!path) continue
      if (isGlob(path)) {
        resolvedFiles.push(...expandGlob(files, path))
      } else if (files.has(path)) {
        resolvedFiles.push(path)
      } else {
        return err(`head: ${path}: No such file`)
      }
    }

    if (resolvedFiles.length === 0) {
      return err(`head: no matches`)
    }

    const showHeaders = resolvedFiles.length > 1
    const results = resolvedFiles.map((path) => {
      const content = files.get(path)!
      const lines = content.split("\n").slice(0, count).join("\n")
      return showHeaders ? `==> ${path} <==\n${lines}` : lines
    })

    return ok(results.join("\n\n"))
  },
})
