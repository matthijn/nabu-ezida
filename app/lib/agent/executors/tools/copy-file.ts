import { tool, registerTool, ok, err } from "../tool"
import { copyFile as def } from "./copy-file.def"
import { getFile } from "~/lib/files"

const copyFile = registerTool(
  tool({
    ...def,
    handler: async (files, { source, destination }) => {
      const content = getFile(source)
      if (content === undefined) return err(`${source}: No such file`)
      if (files.has(destination)) return err(`${destination}: already exists`)

      return ok(`Copied ${source} → ${destination}`, [
        { type: "write_file", path: destination, content },
      ])
    },
  })
)
