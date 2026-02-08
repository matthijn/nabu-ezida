import { command, ok, err, normalizePath, isGlob, resolveFiles, type Operation } from "./command"

const basename = (path: string): string => path.split("/").pop() ?? path

export const mv = command({
  description: "Move/rename file(s)",
  usage: "mv [-f] <source...> <dest>",
  flags: {
    "-f": { alias: "--force", description: "force overwrite if dest exists" },
  },
  handler: (files) => (paths, flags) => {
    if (paths.length < 2) {
      return err("mv: missing destination")
    }

    const force = flags.has("-f")
    const destRaw = paths[paths.length - 1]
    const srcPatterns = paths.slice(0, -1)

    const sources: string[] = []
    for (const rawPattern of srcPatterns) {
      const resolved = resolveFiles(files, rawPattern)
      if (resolved.length > 0) { sources.push(...resolved); continue }
      const pattern = normalizePath(rawPattern)
      if (!pattern) continue
      return err(isGlob(pattern) ? `mv: ${pattern}: no matches` : `mv: ${pattern}: No such file`)
    }

    if (sources.length === 0) {
      return err("mv: missing source")
    }

    const isDestDir = destRaw.endsWith("/")
    const destBase = normalizePath(destRaw)

    if (sources.length > 1 && !isDestDir) {
      return err("mv: moving multiple files requires dest ending with /")
    }

    const operations: Operation[] = []
    const outputs: string[] = []

    for (const src of sources) {
      const dest = isDestDir ? `${destBase}/${basename(src)}` : destBase!
      if (files.has(dest) && !force) {
        return err(`mv: ${dest}: already exists`)
      }
      if (files.has(dest)) {
        operations.push({ type: "delete", path: dest })
      }
      operations.push({ type: "rename", path: src, newPath: dest })
      outputs.push(`mv ${src} ${dest}`)
    }

    return ok(outputs.join("\n"), operations)
  },
})
