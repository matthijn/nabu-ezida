import { command, ok, err, normalizePath, isGlob, expandGlob } from "./command"

export const grep = command({
  description: "Search for patterns in files",
  usage: "grep [-n] [-i] <pattern> [file]",
  flags: {
    "-n": { description: "prefix with line numbers" },
    "-i": { description: "case insensitive matching" },
    "-R": { description: "recursive (ignored, always recursive)" },
    "-r": { description: "recursive (ignored, always recursive)" },
  },
  handler: (files) => (args, flags, stdin, _flagValues) => {
    const [pattern, rawFilename] = args
    const filename = normalizePath(rawFilename)
    if (!pattern) return err("grep: missing pattern")

    const re = new RegExp(pattern, flags.has("-i") ? "i" : "")
    const results: string[] = []

    const searchFile = (filePath: string, content: string) => {
      content.split("\n").forEach((line, i) => {
        if (re.test(line)) {
          if (flags.has("-n")) {
            results.push(`${filePath}:${i + 1}:\t${line}`)
          } else {
            results.push(`${filePath}:\t${line}`)
          }
        }
      })
    }

    if (!filename && stdin) {
      stdin.split("\n").forEach((line, i) => {
        if (re.test(line)) {
          results.push(flags.has("-n") ? `${i + 1}:\t${line}` : line)
        }
      })
      return ok(results.join("\n"))
    }

    if (filename) {
      if (isGlob(filename)) {
        const matches = expandGlob(files, filename)
        for (const filePath of matches) {
          searchFile(filePath, files.get(filePath)!)
        }
      } else {
        const content = files.get(filename)
        if (content) {
          searchFile(filename, content)
        } else {
          return err(`grep: ${filename}: No such file`)
        }
      }
    } else {
      for (const [filePath, content] of files) {
        searchFile(filePath, content)
      }
    }

    return ok(results.join("\n"))
  },
})
