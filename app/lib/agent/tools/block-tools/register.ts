import type { AnyTool } from "../../executors/tool"
import { getBlockConfig } from "~/lib/data-blocks/registry"
import {
  generatePatchTool,
  generateDeleteTool,
  generateAddTool,
  generateMoveTool,
} from "./generate"

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

const buildEntry = (entry: BlockToolEntry): AnyTool[] => {
  const config = mustGetConfig(entry.language)
  const tools: AnyTool[] = [
    generatePatchTool(entry.language, config, { guidance: entry.guidance }),
    generateDeleteTool(entry.language, config),
  ]
  if (!config.singleton) {
    tools.push(generateAddTool(entry.language, config))
    tools.push(generateMoveTool(entry.language, config))
  }
  return tools
}

const allTools = BLOCK_TOOL_ENTRIES.flatMap(buildEntry)

export const blockPatchTools: AnyTool[] = allTools.filter((t) => t.name.startsWith("patch_"))
export const blockDeleteTools: AnyTool[] = allTools.filter((t) => t.name.startsWith("delete_"))
export const blockAddTools: AnyTool[] = allTools.filter((t) => t.name.startsWith("add_"))
export const blockMoveTools: AnyTool[] = allTools.filter((t) => t.name.startsWith("move_"))
export const blockTools: AnyTool[] = allTools
