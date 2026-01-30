import { command, ok, err } from "./command"

const expandRange = (s: string): string => {
  let result = ""
  let i = 0
  while (i < s.length) {
    if (i + 2 < s.length && s[i + 1] === "-") {
      const start = s.charCodeAt(i)
      const end = s.charCodeAt(i + 2)
      for (let c = start; c <= end; c++) result += String.fromCharCode(c)
      i += 3
    } else {
      result += s[i]
      i++
    }
  }
  return result
}

export const tr = command({
  description: "Translate or delete characters",
  usage: "tr [-d] [-s] <set1> [set2]",
  flags: {
    "-d": { alias: "--delete", description: "delete characters in set1" },
    "-s": { alias: "--squeeze-repeats", description: "squeeze repeated characters" },
  },
  handler: () => (args, flags, stdin) => {
    const set1 = args[0]
    const set2 = args[1]

    if (!set1) return err("tr: missing operand")

    const chars1 = expandRange(set1)
    const deleteMode = flags.has("-d")
    const squeeze = flags.has("-s")

    if (deleteMode) {
      const toDelete = new Set(chars1)
      let result = ""
      let prev = ""
      for (const c of stdin) {
        if (toDelete.has(c)) continue
        if (squeeze && c === prev) continue
        result += c
        prev = c
      }
      return ok(result)
    }

    if (!set2) return err("tr: missing set2 for translation")

    const chars2 = expandRange(set2)
    const map = new Map<string, string>()
    for (let i = 0; i < chars1.length; i++) {
      map.set(chars1[i], chars2[Math.min(i, chars2.length - 1)])
    }

    let result = ""
    let prev = ""
    for (const c of stdin) {
      const mapped = map.get(c) ?? c
      if (squeeze && mapped === prev) continue
      result += mapped
      prev = mapped
    }

    return ok(result)
  },
})
