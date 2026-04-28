import { command, ok, err, resolveFiles, normalizePath, isGlob } from "./command"
import { getFileDate } from "~/domain/data-blocks/attributes/date/selectors"
import { getTags } from "~/domain/data-blocks/attributes/tags/selectors"
import { getTagDisplayById } from "~/domain/data-blocks/settings/tags/selectors"

const sortByName = (names: string[]): string[] => [...names].sort()

const sortByDate = (files: Map<string, string>, names: string[]): string[] =>
  [...names].sort((a, b) => {
    const da = getFileDate(files.get(a) ?? "")
    const db = getFileDate(files.get(b) ?? "")
    if (!da && !db) return a.localeCompare(b)
    if (!da) return 1
    if (!db) return -1
    return da.localeCompare(db)
  })

const allFileNames = (files: Map<string, string>): string[] => [...files.keys()]

const isRootPath = (path: string): boolean => normalizePath(path) === undefined

const isDirectoryLike = (path: string): boolean => {
  const normalized = normalizePath(path)
  return normalized !== undefined && !isGlob(normalized) && !normalized.includes(".")
}

const resolvePatterns = (files: Map<string, string>, paths: string[]): string[] | null => {
  const resolved = paths.flatMap((p) => resolveFiles(files, p))
  if (resolved.length === 0) return null
  return [...new Set(resolved)]
}

const formatTagId = (settingsRaw: string, id: string): string => {
  const display = getTagDisplayById(settingsRaw, id)
  return display ? `${display} (${id})` : id
}

const formatTags = (raw: string, settingsRaw: string): string => {
  const tags = getTags(raw)
  if (tags.length === 0) return ""
  return `  [${tags.map((id) => formatTagId(settingsRaw, id)).join(", ")}]`
}

const formatDate = (raw: string): string => {
  const date = getFileDate(raw)
  return date ? `  ${date}` : ""
}

const formatLong = (files: Map<string, string>, names: string[], settingsRaw: string): string =>
  names
    .map((name) => {
      const raw = files.get(name) ?? ""
      const size = raw.length
      const date = getFileDate(raw) ?? ""
      const tags = formatTags(raw, settingsRaw)
      return `${String(size).padStart(8)}  ${date.padEnd(10)}  ${name}${tags}`
    })
    .join("\n")

interface ShowFlags {
  tags: boolean
  date: boolean
}

const formatSuffix = (raw: string, show: ShowFlags, settingsRaw: string): string => {
  const date = show.date ? formatDate(raw) : ""
  const tags = show.tags ? formatTags(raw, settingsRaw) : ""
  return `${date}${tags}`
}

const formatShort = (
  files: Map<string, string>,
  names: string[],
  show: ShowFlags,
  settingsRaw: string
): string => {
  if (!show.tags && !show.date) return names.join("\n")
  return names
    .map((name) => `${name}${formatSuffix(files.get(name) ?? "", show, settingsRaw)}`)
    .join("\n")
}

export const ls = command({
  description: "List files",
  usage: "ls [-l] [-t] [--show-tags] [--show-date] [pattern...]",
  flags: {
    "-l": { alias: "--long", description: "long format with sizes, dates, and tags" },
    "-1": { description: "one per line (default)" },
    "-a": { alias: "--all", description: "ignored (no hidden files)" },
    "-t": { description: "sort by date" },
    "--show-tags": { description: "show tags alongside filenames" },
    "--show-date": { description: "show date alongside filenames" },
  },
  handler: (files) => (paths, flags) => {
    const isAllRoot = paths.length > 0 && paths.every(isRootPath)
    const hasDirectory = paths.some(isDirectoryLike)

    if (hasDirectory) return err(`ls: no subdirectories exist (use 'ls' or 'ls /')`)

    const unsorted =
      paths.length === 0 || isAllRoot ? allFileNames(files) : resolvePatterns(files, paths)

    if (unsorted === null) return err(`ls: no matches found`)
    if (unsorted.length === 0) return ok("")

    const sortByTime = flags.has("-t")
    const names = sortByTime ? sortByDate(files, unsorted) : sortByName(unsorted)
    const show: ShowFlags = { tags: flags.has("-show-tags"), date: flags.has("-show-date") }
    const settingsRaw = files.get("settings.hidden.md") ?? ""

    return ok(
      flags.has("-l")
        ? formatLong(files, names, settingsRaw)
        : formatShort(files, names, show, settingsRaw)
    )
  },
})
