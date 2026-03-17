import { z } from "zod"
import type { AnyTool } from "../tool"
import { getApproachMeta } from "~/lib/modes/approaches"

const formatKeyDescriptions = (keys: string[], descriptions: Record<string, string>): string =>
  keys.map((k) => {
    const desc = descriptions[k]
    return desc ? `- ${k}: ${desc}` : `- ${k}`
  }).join("\n")

export const buildSchema = () => {
  const { keys, descriptions } = getApproachMeta()
  const availableList = formatKeyDescriptions(keys, descriptions)
  return z.object({
    for: z.array(z.enum(keys as [string, ...string[]])).describe(`Guidance keys to load.\n\n${availableList}`),
  })
}

type GetGuidanceArgs = z.infer<ReturnType<typeof buildSchema>>

export const getGuidanceTool: AnyTool = {
  name: "get_guidance",
  description: "Load task-specific guidance playbooks. Index files are included automatically. Always include the project phase that matches the current state (one of the project/* keys).",
  get schema() {
    return buildSchema()
  },
}
