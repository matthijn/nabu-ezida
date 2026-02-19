import { orientate as def } from "./orientate.def"
import { registerDelegationHandler, startPhase } from "../delegation"

const formatOrientContext = (question: string, direction: string): string =>
  [
    "# Orientation Task",
    `**Question:** ${question}`,
    `**Initial direction:** ${direction}`,
  ].join("\n")

const executeOrientate = async (call: { args: unknown }) => {
  const parsed = def.schema.safeParse(call.args)
  if (!parsed.success) return { status: "error" as const, output: `Invalid args: ${parsed.error.message}` }

  return startPhase("qualitative-researcher/orient", formatOrientContext(parsed.data.question, parsed.data.direction))
}

registerDelegationHandler("orientate", executeOrientate)
