import { command } from "./command"

export const grep = command({
  description: "Search for patterns in files",
  usage: "grep [-n] [-i] <pattern> [file]",
  flags: {
    "-n": { description: "prefix with line numbers" },
    "-i": { description: "case insensitive matching" },
  },
  handler: (files) => (args, flags, stdin, _flagValues) => {
    const [pattern, filename] = args
    if (!pattern) return "grep: missing pattern"

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
      return results.join("\n")
    }

    if (filename) {
      const content = files.get(filename)
      if (content) {
        searchFile(filename, content)
      } else {
        return `grep: ${filename}: No such file`
      }
    } else {
      for (const [filePath, content] of files) {
        searchFile(filePath, content)
      }
    }

    return results.join("\n")
  },
})
