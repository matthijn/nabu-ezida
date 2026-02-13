import { z } from "zod"
import { tool, registerTool, ok } from "./tool"

const ResolveArgs = z.object({
  outcome: z.string().describe("What was accomplished. Should be clear enough that the caller can determine if the task met the original outcome without inspecting the artifacts themselves."),
  unresolved: z.string().optional().describe("What couldn't be completed and why. Omit if everything is done. Be specific enough that the caller can decide to retry, delegate elsewhere, or ask the user. Include what would be needed to resolve the remaining items."),
  artifacts: z.array(z.string()).optional().describe("Files created or modified. The caller uses these to pass results to the next task or present to the user."),
})

export const resolve = registerTool(
  tool({
    name: "resolve",
    description: "Report successful completion of delegated task.",
    schema: ResolveArgs,
    handler: async (_files, args) => ok(args),
  })
)

const RejectArgs = z.object({
  reason: z.string().describe("Why this task can't be started. Not a failure mid-work — that's a resolve with unresolved items. This is 'I can't even begin.' Be specific enough that the caller can fix the problem, delegate elsewhere, or explain it to the user."),
  need: z.string().optional().describe("What would need to change for this task to succeed. 'Provide a codebook', 'file is empty', 'clarify what code loosely means'. Gives the caller something actionable."),
})

export const reject = registerTool(
  tool({
    name: "reject",
    description: "Report that the delegated task cannot be completed.",
    schema: RejectArgs,
    handler: async (_files, args) => ok(args),
  })
)

export const TERMINAL_TOOLS = new Set(["resolve", "reject"])
