import type { AnyTool } from "../../executors/tool"
import { getBlockConfig } from "~/lib/data-blocks/registry"
import { generatePatchTool, generateDeleteTool } from "./generate"

const CHART_GUIDANCE_KEY = "qual-coding/project/output"

interface BlockToolEntry {
  language: string
  guidance?: string
}

const BLOCK_TOOL_ENTRIES: BlockToolEntry[] = [
  { language: "json-attributes" },
  { language: "json-annotations" },
  { language: "json-callout" },
  { language: "json-settings" },
  { language: "json-chart", guidance: CHART_GUIDANCE_KEY },
]

const mustGetConfig = (language: string) => {
  const config = getBlockConfig(language)
  if (!config) throw new Error(`no block config for ${language}`)
  return config
}

const buildEntry = (entry: BlockToolEntry): [AnyTool, AnyTool] => {
  const config = mustGetConfig(entry.language)
  const patch = generatePatchTool(entry.language, config, { guidance: entry.guidance })
  const del = generateDeleteTool(entry.language, config)
  return [patch, del]
}

const allTools = BLOCK_TOOL_ENTRIES.flatMap(buildEntry)

export const blockPatchTools: AnyTool[] = allTools.filter((t) => t.name.startsWith("patch_"))
export const blockDeleteTools: AnyTool[] = allTools.filter((t) => t.name.startsWith("delete_"))
export const blockTools: AnyTool[] = allTools
