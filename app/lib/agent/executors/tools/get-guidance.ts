import type { Block, ToolResult } from "../../types"
import { GetGuidanceArgs } from "./get-guidance.def"
import { registerSpecialHandler } from "../delegation"
import { approaches, resolveApproaches } from "~/domain/approaches"
import { pushBlocks } from "../../block-store"

const PROJECT_PREFIX = "qual-coding/project/"

const isProjectPhaseKey = (key: string): boolean =>
  key.startsWith(PROJECT_PREFIX) && !key.endsWith("/index")

const hasProjectPhase = (keys: readonly string[]): boolean =>
  keys.some(isProjectPhaseKey)

const toApproachBlock = ({ key, content }: { key: string; content: string }): Block =>
  ({ type: "system", content: `[${key}]\n${content}` })

const handleGetGuidance = async (call: { args: unknown }): Promise<ToolResult<unknown>> => {
  const parsed = GetGuidanceArgs.safeParse(call.args)
  if (!parsed.success) return { status: "error", output: `Invalid args: ${parsed.error.message}` }

  const keys = parsed.data.for
  const entries = resolveApproaches(keys, approaches)
  if (entries.length === 0) return { status: "error", output: "No matching guidance found for the given keys." }

  pushBlocks(entries.map(toApproachBlock))

  const loaded = entries.map((e) => e.key).join(", ")

  if (!hasProjectPhase(keys)) {
    return { status: "partial", output: `Loaded: ${loaded}. Missing project phase — include one of the project/* keys for the current project state.` }
  }

  return { status: "ok", output: `Loaded: ${loaded}` }
}

registerSpecialHandler("get_guidance", handleGetGuidance)
