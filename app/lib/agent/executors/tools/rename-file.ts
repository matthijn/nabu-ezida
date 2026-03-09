import { tool, registerTool, ok, err } from "../tool"
import { renameFile as def } from "./rename-file.def"
import { normalizeFilename, isProtectedFile } from "~/lib/files/filename"

export const renameFile = registerTool(
  tool({
    ...def,
    handler: async (files, { source, destination }) => {
      if (isProtectedFile(source)) return err(`${source}: protected file, cannot be renamed`)
      const sanitized = normalizeFilename(destination)
      if (!files.has(source)) return err(`${source}: No such file`)
      if (files.has(sanitized)) return err(`${sanitized}: already exists`)

      return ok(`Renamed ${source} → ${sanitized}`, [
        { type: "rename_file", path: source, newPath: sanitized },
      ])
    },
  })
)
