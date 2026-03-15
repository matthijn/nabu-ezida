import type { Block, ToolResult } from "../../types"
import { buildSchema } from "./get-guidance.def"
import { registerSpecialHandler } from "../delegation"
import { pushBlocks } from "../../block-store"

const PROJECT_PREFIX = "qual-coding/project/"

const isProjectPhaseKey = (key: string): boolean =>
  key.startsWith(PROJECT_PREFIX) && !key.endsWith("/index")

const hasProjectPhase = (keys: readonly string[]): boolean =>
  keys.some(isProjectPhaseKey)

const toMarkerBlock = (key: string): Block =>
  ({ type: "system", content: `<!-- approach: ${key} -->` })

const handleGetGuidance = async (call: { args: unknown }): Promise<ToolResult<unknown>> => {
  const parsed = buildSchema().safeParse(call.args)
  if (!parsed.success) return { status: "error", output: `Invalid args: ${parsed.error.message}` }

  const keys: string[] = parsed.data.for
  if (keys.length === 0) return { status: "error", output: "No guidance keys provided." }

  pushBlocks(keys.map(toMarkerBlock))

  const loaded = keys.join(", ")

  if (!hasProjectPhase(keys)) {
    return { status: "partial", output: `Loaded: ${loaded}. Missing project phase — include one of the project/* keys for the current project state.` }
  }

  return { status: "ok", output: `Loaded: ${loaded}` }
}

registerSpecialHandler("get_guidance", handleGetGuidance)
