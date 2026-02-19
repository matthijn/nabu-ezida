import { tool, registerTool, ok, err } from "../tool"
import { renameFile as def } from "./rename-file.def"

export const renameFile = registerTool(
  tool({
    ...def,
    handler: async (files, { source, destination }) => {
      if (!files.has(source)) return err(`${source}: No such file`)
      if (files.has(destination)) return err(`${destination}: already exists`)

      return ok(`Renamed ${source} → ${destination}`, [
        { type: "rename_file", path: source, newPath: destination },
      ])
    },
  })
)
