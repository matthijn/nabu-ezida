import { command, ok, err, normalizePath, type Operation } from "./command"

export const cp = command({
  description: "Copy file",
  usage: "cp [-f] <source> <dest>",
  flags: {
    "-f": { alias: "--force", description: "force overwrite if dest exists" },
  },
  handler: (files) => (paths, flags) => {
    if (paths.length < 2) {
      return err("cp: missing destination")
    }
    if (paths.length > 2) {
      return err("cp: too many arguments")
    }

    const src = normalizePath(paths[0])
    const dest = normalizePath(paths[1])
    if (!src || !dest) {
      return err("cp: invalid path")
    }

    if (!files.has(src)) {
      return err(`cp: ${src}: No such file`)
    }
    if (files.has(dest) && !flags.has("-f")) {
      return err(`cp: ${dest}: already exists`)
    }

    const content = files.get(src)!
    const operation: Operation = { type: "create", path: dest, content }
    return ok(`cp ${src} ${dest}`, [operation])
  },
})
