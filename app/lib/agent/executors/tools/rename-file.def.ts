import { z } from "zod"

const RenameFileArgs = z.object({
  source: z.string().min(1).describe("Current path of the file"),
  destination: z.string().min(1).describe("New path for the file. Will be lowercased with spaces converted to underscores."),
})

export const renameFile = {
  name: "rename_file" as const,
  description: "Rename/move a file. Fails if source is missing or destination already exists.",
  schema: RenameFileArgs,
}
