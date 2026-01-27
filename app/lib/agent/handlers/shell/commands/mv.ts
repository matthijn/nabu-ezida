import { command, ok, err, type Operation } from "./command"

export const mv = command({
  description: "Rename file",
  usage: "mv <source> <dest>",
  flags: {},
  handler: (files) => (paths) => {
    if (paths.length < 2) {
      return err("mv: missing destination")
    }
    if (paths.length > 2) {
      return err("mv: too many arguments")
    }

    const [src, dest] = paths

    if (!files.has(src)) {
      return err(`mv: ${src}: No such file`)
    }
    if (files.has(dest)) {
      return err(`mv: ${dest}: already exists`)
    }

    const operation: Operation = { type: "rename", oldPath: src, newPath: dest }
    return ok(`mv ${src} ${dest}`, [operation])
  },
})
