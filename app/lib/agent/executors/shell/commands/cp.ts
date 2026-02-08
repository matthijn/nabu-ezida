import { command, ok, err, normalizePath, isGlob, resolveFiles, type Operation } from "./command"

const basename = (path: string): string => path.split("/").pop() ?? path

export const cp = command({
  description: "Copy file(s)",
  usage: "cp [-f] <source...> <dest>",
  flags: {
    "-f": { alias: "--force", description: "force overwrite if dest exists" },
  },
  handler: (files) => (paths, flags) => {
    if (paths.length < 2) {
      return err("cp: missing destination")
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
      return err(isGlob(pattern) ? `cp: ${pattern}: no matches` : `cp: ${pattern}: No such file`)
    }

    if (sources.length === 0) {
      return err("cp: missing source")
    }

    const isDestDir = destRaw.endsWith("/")
    const destBase = normalizePath(destRaw)

    if (sources.length > 1 && !isDestDir) {
      return err("cp: copying multiple files requires dest ending with /")
    }

    const operations: Operation[] = []
    const outputs: string[] = []

    for (const src of sources) {
      const dest = isDestDir ? `${destBase}/${basename(src)}` : destBase!
      if (files.has(dest) && !force) {
        return err(`cp: ${dest}: already exists`)
      }
      operations.push({ type: "create", path: dest, content: files.get(src)! })
      outputs.push(`cp ${src} ${dest}`)
    }

    return ok(outputs.join("\n"), operations)
  },
})
