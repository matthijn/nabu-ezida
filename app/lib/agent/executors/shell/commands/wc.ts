import { command, ok, err, normalizePath, isGlob, resolveFiles } from "./command"

export const wc = command({
  description: "Word, line, character count",
  usage: "wc [-l] [-w] [-c] [file...]",
  flags: {
    "-l": { alias: "--lines", description: "line count only" },
    "-w": { alias: "--words", description: "word count only" },
    "-c": { alias: "--bytes", description: "character count only" },
  },
  handler: (files) => (paths, flags, stdin, _flagValues) => {
    const countFile = (content: string) => ({
      lines: content.split("\n").length,
      words: content.split(/\s+/).filter(Boolean).length,
      chars: content.length,
    })

    const formatCount = (c: { lines: number; words: number; chars: number }, name: string) => {
      if (flags.has("-l")) return `${c.lines} ${name}`.trim()
      if (flags.has("-w")) return `${c.words} ${name}`.trim()
      if (flags.has("-c")) return `${c.chars} ${name}`.trim()
      return `${c.lines} ${c.words} ${c.chars} ${name}`.trim()
    }

    if (paths.length === 0) {
      return ok(formatCount(countFile(stdin), ""))
    }

    const resolved: string[] = []
    for (const rawPath of paths) {
      const matches = resolveFiles(files, rawPath)
      if (matches.length > 0) { resolved.push(...matches); continue }
      const path = normalizePath(rawPath)
      if (path && !isGlob(path)) return err(`wc: ${path}: No such file`)
    }

    if (resolved.length === 0) {
      return err(`wc: no matches`)
    }

    const results = resolved.map((path) => formatCount(countFile(files.get(path)!), path))

    if (resolved.length > 1) {
      const totals = resolved.reduce(
        (acc, path) => {
          const c = countFile(files.get(path)!)
          return { lines: acc.lines + c.lines, words: acc.words + c.words, chars: acc.chars + c.chars }
        },
        { lines: 0, words: 0, chars: 0 }
      )
      results.push(formatCount(totals, "total"))
    }

    return ok(results.join("\n"))
  },
})
