import { z } from "zod"
import type { ToolResult } from "../../types"
import { registerSpecialHandler } from "../delegation"

const CompactedArgs = z.object({ summary: z.string(), directives: z.record(z.string(), z.string()).optional() })

const executeCompacted = async (call: { args: unknown }): Promise<ToolResult<unknown>> => {
  const parsed = CompactedArgs.safeParse(call.args)
  if (!parsed.success) return { status: "error", output: `Invalid args: ${parsed.error.message}` }
  return { status: "ok", output: "ok" }
}

registerSpecialHandler("compacted", executeCompacted)
