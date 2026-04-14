import { z } from "zod"

const RemoveFileArgs = z.object({
  path: z.string().min(1).describe("Path of the file to remove"),
})

export const removeFile = {
  name: "remove_file" as const,
  description:
    "Delete a file. Fails if the file does not exist.\n\nparallel: self=yes (if independent) / others=not with ops on same file / file gone after call",
  schema: RemoveFileArgs,
}
