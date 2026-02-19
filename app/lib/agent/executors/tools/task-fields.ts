import { z } from "zod"

export const taskFields = {
  intent: z.string().describe("What the user wants, in one sentence. Pass along the goal — the receiver decides how to approach it."),
  context: z.string().optional().describe("Relevant file paths, background, or anything the receiver needs to get started."),
}
