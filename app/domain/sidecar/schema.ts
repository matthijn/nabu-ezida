import { z } from "zod"

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)

export const DocumentMeta = z.object({
  tags: z.array(slug).optional(),
})

export type DocumentMeta = z.infer<typeof DocumentMeta>
