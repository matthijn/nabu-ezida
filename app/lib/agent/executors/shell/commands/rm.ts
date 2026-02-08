import { command, ok, err, normalizePath, isGlob, resolveFiles, type Operation } from "./command"

export const rm = command({
  description: "Remove files",
  usage: "rm [-f] <file>...",
  flags: {
    "-f": { alias: "--force", description: "ignore missing files" },
    "-r": { alias: "--recursive", description: "ignored (no directories)" },
    "-R": { description: "ignored (no directories)" },
  },
  handler: (files) => (paths, flags) => {
    if (paths.length === 0) {
      return err("rm: missing operand")
    }

    const force = flags.has("-f")
    const operations: Operation[] = []
    const outputs: string[] = []
    const errors: string[] = []

    for (const rawPattern of paths) {
      const resolved = resolveFiles(files, rawPattern)
      if (resolved.length > 0) {
        for (const path of resolved) { operations.push({ type: "delete", path }); outputs.push(`rm ${path}`) }
        continue
      }
      if (!force) {
        const pattern = normalizePath(rawPattern)
        if (!pattern) errors.push(`rm: invalid path`)
        else if (isGlob(pattern)) errors.push(`rm: ${pattern}: no matches`)
        else errors.push(`rm: ${pattern}: No such file`)
      }
    }

    if (errors.length > 0 && operations.length === 0) {
      return err(errors.join("\n"))
    }

    return ok(outputs.join("\n"), operations.length > 0 ? operations : undefined)
  },
})
