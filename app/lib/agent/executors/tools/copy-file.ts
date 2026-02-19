import { tool, registerTool, ok, err } from "../tool"
import { copyFile as def } from "./copy-file.def"

const formatCreateDiff = (path: string, content: string): string => {
  if (content === "") return `*** Add File: ${path}`
  const prefixed = content.split("\n").map((line) => `+${line}`).join("\n")
  return `*** Add File: ${path}\n${prefixed}`
}

export const copyFile = registerTool(
  tool({
    ...def,
    handler: async (files, { source, destination }) => {
      const content = files.get(source)
      if (content === undefined) return err(`${source}: No such file`)
      if (files.has(destination)) return err(`${destination}: already exists`)

      return ok(`Copied ${source} → ${destination}`, [
        { type: "create_file", path: destination, diff: formatCreateDiff(destination, content) },
      ])
    },
  })
)
