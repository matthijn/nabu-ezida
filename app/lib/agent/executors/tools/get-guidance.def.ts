import { z } from "zod"
import type { AnyTool } from "../tool"
import { approachKeys, approachDescriptions } from "~/domain/approaches"

const formatKeyDescriptions = (keys: string[], descriptions: Record<string, string>): string =>
  keys.map((k) => {
    const desc = descriptions[k]
    return desc ? `- ${k}: ${desc}` : `- ${k}`
  }).join("\n")

const availableList = formatKeyDescriptions(approachKeys, approachDescriptions)

const keyEnum = z.enum(approachKeys as [string, ...string[]])

export const GetGuidanceArgs = z.object({
  for: z.array(keyEnum).describe(`Guidance keys to load.\n\n${availableList}`),
})

export const getGuidanceTool: AnyTool = {
  name: "get_guidance",
  description: "Load task-specific guidance playbooks. Index files are included automatically. Always include the project phase that matches the current state (one of the project/* keys).",
  schema: GetGuidanceArgs,
}
