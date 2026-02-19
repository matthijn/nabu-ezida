import { tool, registerTool, ok, err } from "../tool"
import { removeFile as def } from "./remove-file.def"

export const removeFile = registerTool(
  tool({
    ...def,
    handler: async (files, { path }) => {
      if (!files.has(path)) return err(`${path}: No such file`)

      return ok(`Removed ${path}`, [{ type: "delete_file", path }])
    },
  })
)
