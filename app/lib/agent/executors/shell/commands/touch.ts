import { command, ok, err, normalizePath, type Operation } from "./command"

export const touch = command({
  description: "Create empty file",
  usage: "touch <file>",
  flags: {},
  handler: (files) => (args) => {
    const path = normalizePath(args[0])
    if (!path) return err("touch: missing file operand")

    if (files.has(path)) {
      return ok(`touch: ${path} (already exists)`)
    }

    const operation: Operation = { type: "create", path, content: "" }
    return ok(`touch ${path}`, [operation])
  },
})
