import { command, ok, err, normalizePath, isGlob, expandGlob, type Operation } from "./command"

export const rm = command({
  description: "Remove files",
  usage: "rm <file>...",
  flags: {},
  handler: (files) => (paths) => {
    if (paths.length === 0) {
      return err("rm: missing operand")
    }

    const operations: Operation[] = []
    const outputs: string[] = []
    const errors: string[] = []

    for (const rawPattern of paths) {
      const pattern = normalizePath(rawPattern)
      if (!pattern) {
        errors.push(`rm: invalid path`)
        continue
      }
      if (isGlob(pattern)) {
        const matches = expandGlob(files, pattern)
        if (matches.length === 0) {
          errors.push(`rm: ${pattern}: no matches`)
        } else {
          for (const path of matches) {
            operations.push({ type: "delete", path })
            outputs.push(`rm ${path}`)
          }
        }
      } else {
        if (!files.has(pattern)) {
          errors.push(`rm: ${pattern}: No such file`)
        } else {
          operations.push({ type: "delete", path: pattern })
          outputs.push(`rm ${pattern}`)
        }
      }
    }

    if (errors.length > 0 && operations.length === 0) {
      return err(errors.join("\n"))
    }

    return ok(outputs.join("\n"), operations.length > 0 ? operations : undefined)
  },
})
