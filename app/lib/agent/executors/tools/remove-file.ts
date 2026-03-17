import { tool, registerTool, ok, err } from "../tool"
import { removeFile as def } from "./remove-file.def"
import { isProtectedFile } from "~/lib/files/filename"

const _removeFile = registerTool(
  tool({
    ...def,
    handler: async (files, { path }) => {
      if (isProtectedFile(path)) return err(`${path}: protected file, cannot be deleted`)
      if (!files.has(path)) return err(`${path}: No such file`)

      return ok(`Removed ${path}`, [{ type: "delete_file", path }])
    },
  })
)
