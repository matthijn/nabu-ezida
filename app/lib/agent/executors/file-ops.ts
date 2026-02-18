import { z } from "zod"
import { tool, registerTool, ok, err } from "./tool"

const formatCreateDiff = (path: string, content: string): string => {
  if (content === "") return `*** Add File: ${path}`
  const prefixed = content.split("\n").map((line) => `+${line}`).join("\n")
  return `*** Add File: ${path}\n${prefixed}`
}

const CopyFileArgs = z.object({
  source: z.string().min(1).describe("Path of the file to copy"),
  destination: z.string().min(1).describe("Path for the new copy"),
})

export const copyFile = registerTool(
  tool({
    name: "copy_file",
    description: "Copy a file to a new path. Fails if source is missing or destination already exists.",
    schema: CopyFileArgs,
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

const RenameFileArgs = z.object({
  source: z.string().min(1).describe("Current path of the file"),
  destination: z.string().min(1).describe("New path for the file"),
})

export const renameFile = registerTool(
  tool({
    name: "rename_file",
    description: "Rename/move a file. Fails if source is missing or destination already exists.",
    schema: RenameFileArgs,
    handler: async (files, { source, destination }) => {
      if (!files.has(source)) return err(`${source}: No such file`)
      if (files.has(destination)) return err(`${destination}: already exists`)

      return ok(`Renamed ${source} → ${destination}`, [
        { type: "rename_file", path: source, newPath: destination },
      ])
    },
  })
)

const RemoveFileArgs = z.object({
  path: z.string().min(1).describe("Path of the file to remove"),
})

export const removeFile = registerTool(
  tool({
    name: "remove_file",
    description: "Delete a file. Fails if the file does not exist.",
    schema: RemoveFileArgs,
    handler: async (files, { path }) => {
      if (!files.has(path)) return err(`${path}: No such file`)

      return ok(`Removed ${path}`, [{ type: "delete_file", path }])
    },
  })
)
