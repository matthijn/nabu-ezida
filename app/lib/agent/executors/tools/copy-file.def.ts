import { z } from "zod"

const CopyFileArgs = z.object({
  source: z.string().min(1).describe("Path of the file to copy"),
  destination: z.string().min(1).describe("Path for the new copy"),
})

export const copyFile = {
  name: "copy_file" as const,
  description: "Copy a file to a new path. Fails if source is missing or destination already exists.",
  schema: CopyFileArgs,
}
