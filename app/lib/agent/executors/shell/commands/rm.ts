import { minimatch } from "minimatch"
import { command, ok, err, type Operation } from "./command"

const isGlob = (pattern: string): boolean =>
  pattern.includes("*") || pattern.includes("?")

const expandGlob = (files: Map<string, string>, pattern: string): string[] =>
  Array.from(files.keys()).filter((f) => minimatch(f, pattern))

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

    for (const pattern of paths) {
      if (isGlob(pattern)) {
        const matches = expandGlob(files, pattern)
        if (matches.length === 0) {
          outputs.push(`rm: ${pattern}: no matches`)
        } else {
          for (const path of matches) {
            operations.push({ type: "delete", path })
            outputs.push(`rm ${path}`)
          }
        }
      } else {
        if (!files.has(pattern)) {
          outputs.push(`rm: ${pattern}: No such file`)
        } else {
          operations.push({ type: "delete", path: pattern })
          outputs.push(`rm ${pattern}`)
        }
      }
    }

    return ok(outputs.join("\n"), operations.length > 0 ? operations : undefined)
  },
})
