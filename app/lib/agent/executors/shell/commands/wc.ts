import { command, ok, err, normalizePath } from "./command"

export const wc = command({
  description: "Word, line, character count",
  usage: "wc [-l] [-w] [-c] <file>",
  flags: {
    "-l": { alias: "--lines", description: "line count only" },
    "-w": { alias: "--words", description: "word count only" },
    "-c": { alias: "--bytes", description: "character count only" },
  },
  handler: (files) => (paths, flags, stdin, _flagValues) => {
    const filename = normalizePath(paths[0])
    const content = filename ? files.get(filename) ?? null : stdin

    if (content === null) return err(`wc: ${filename}: No such file`)

    const lines = content.split("\n").length
    const words = content.split(/\s+/).filter(Boolean).length
    const chars = content.length
    const file = filename || ""

    if (flags.has("-l")) return ok(`${lines} ${file}`.trim())
    if (flags.has("-w")) return ok(`${words} ${file}`.trim())
    if (flags.has("-c")) return ok(`${chars} ${file}`.trim())

    return ok(`${lines} ${words} ${chars} ${file}`.trim())
  },
})
