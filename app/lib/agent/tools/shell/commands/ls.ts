import { command, ok, err, resolveFiles, normalizePath, isGlob } from "./command"

const allFileNames = (files: Map<string, string>): string[] => [...files.keys()].sort()

const isRootPath = (path: string): boolean => normalizePath(path) === undefined

const isDirectoryLike = (path: string): boolean => {
  const normalized = normalizePath(path)
  return normalized !== undefined && !isGlob(normalized) && !normalized.includes(".")
}

const resolvePatterns = (files: Map<string, string>, paths: string[]): string[] | null => {
  const resolved = paths.flatMap((p) => resolveFiles(files, p))
  if (resolved.length === 0) return null
  return [...new Set(resolved)].sort()
}

const formatLong = (files: Map<string, string>, names: string[]): string =>
  names
    .map((name) => {
      const size = files.get(name)?.length ?? 0
      return `${String(size).padStart(8)}  ${name}`
    })
    .join("\n")

export const ls = command({
  description: "List files",
  usage: "ls [-l] [-1] [pattern...]",
  flags: {
    "-l": { alias: "--long", description: "long format with sizes" },
    "-1": { description: "one per line (default)" },
    "-a": { alias: "--all", description: "ignored (no hidden files)" },
  },
  handler: (files) => (paths, flags) => {
    const isAllRoot = paths.length > 0 && paths.every(isRootPath)
    const hasDirectory = paths.some(isDirectoryLike)

    if (hasDirectory) return err(`ls: no subdirectories exist (use 'ls' or 'ls /')`)

    const names =
      paths.length === 0 || isAllRoot ? allFileNames(files) : resolvePatterns(files, paths)

    if (names === null) return err(`ls: no matches found`)
    if (names.length === 0) return ok("")

    return ok(flags.has("-l") ? formatLong(files, names) : names.join("\n"))
  },
})
