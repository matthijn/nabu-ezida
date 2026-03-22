import type { AnyTool } from "./tool"
import type { Nudger } from "../steering/nudge-tools"
import type { Block } from "../client"
import {
  patchJsonBlock,
  applyLocalPatch,
  copyFile,
  renameFile,
  removeFile,
  runLocalShell,
  cancel,
  preflightTool,
  getGuidanceTool,
  completeStep,
  askTool,
  recordDecisionTool,
  submitPlanTool,
  queryTool,
  searchTool,
} from "../tools"
import { baselineNudge } from "../steering/nudges/baseline"
import { buildToolNudges } from "../steering/nudges"
import { createMemoryNudge } from "../steering/nudges/memory"
import { createSettingsNudge } from "../steering/nudges/settings"
import { createStepStateNudge } from "../steering/nudges/step-state"
import { createPlanProgressNudge } from "../steering/nudges/plan-progress"
import { getFiles } from "~/lib/files/store"
// off is for gpt mini, none is for gpt regular (or its 5.2 vs 5... unclear)
type ReasoningLevel = "none" | "low" | "medium" | "high"

interface ModeConfig {
  tools: AnyTool[]
  triggers: string[]
  prompt?: string
  model: string
  reasoning: ReasoningLevel
  verbosity: string
  nudges: Nudger[]
}

type ModeName = "chat" | "plan" | "exec"

const toolNudges = buildToolNudges(getFiles)
const memoryNudge = createMemoryNudge(getFiles)
const settingsNudge = createSettingsNudge(getFiles)
const stepStateNudge = createStepStateNudge(getFiles)
const planProgressNudge = createPlanProgressNudge(getFiles)

const resolveToolNudges = (tools: AnyTool[], nudges: Nudger[]): Nudger[] => {
  const fromTools = tools.flatMap((t) => toolNudges[t.name] ?? [])
  return [...nudges, ...fromTools]
}

const raw: Record<ModeName, ModeConfig> = {
  chat: {
    tools: [
      runLocalShell,
      queryTool,
      searchTool,
      patchJsonBlock,
      applyLocalPatch,
      copyFile,
      renameFile,
      removeFile,
      preflightTool,
      getGuidanceTool,
      askTool,
      recordDecisionTool,
    ],
    triggers: ["cancel"],
    model: "gpt-5.4",
    reasoning: "low",
    verbosity: "low",
    nudges: [baselineNudge, memoryNudge, settingsNudge],
  },
  plan: {
    tools: [
      runLocalShell,
      queryTool,
      searchTool,
      preflightTool,
      getGuidanceTool,
      submitPlanTool,
      cancel,
      askTool,
      recordDecisionTool,
    ],
    triggers: [],
    prompt: "planning",
    model: "gpt-5.4",
    reasoning: "high",
    verbosity: "low",
    nudges: [baselineNudge, memoryNudge, settingsNudge],
  },
  exec: {
    tools: [
      runLocalShell,
      queryTool,
      searchTool,
      patchJsonBlock,
      applyLocalPatch,
      copyFile,
      renameFile,
      removeFile,
      cancel,
      completeStep,
      askTool,
      recordDecisionTool,
    ],
    triggers: ["submit_plan"],
    prompt: "execution",
    model: "gpt-5.4",
    reasoning: "medium",
    verbosity: "medium",
    nudges: [baselineNudge, memoryNudge, settingsNudge, stepStateNudge, planProgressNudge],
  },
}

export const modes: Record<ModeName, ModeConfig> = Object.fromEntries(
  Object.entries(raw).map(([k, m]) => [k, { ...m, nudges: resolveToolNudges(m.tools, m.nudges) }])
) as Record<ModeName, ModeConfig>

const triggerToMode: Record<string, ModeName> = Object.fromEntries(
  Object.entries(modes).flatMap(([mode, config]) =>
    config.triggers.map((trigger) => [trigger, mode as ModeName])
  )
)

export const DEFAULT_MODE: ModeName = "chat"

export const ENDPOINT = "/qual-coder?chat=true"

const promptToMode: Record<string, ModeName> = {
  planning: "plan",
  execution: "exec",
}

const modeFromPromptMarker = (content: string): ModeName | undefined => {
  const match = content.match(/<!-- prompt: (\w+) -->/)
  return match ? promptToMode[match[1]] : undefined
}

export const deriveMode = (blocks: Block[]): ModeName => {
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i]
    if (block.type === "tool_result" && block.toolName) {
      const mode = triggerToMode[block.toolName]
      if (mode) return mode
    }
    if (block.type === "system") {
      const mode = modeFromPromptMarker(block.content)
      if (mode) return mode
    }
  }
  return DEFAULT_MODE
}

export const modeSystemBlocks = (mode: ModeName): Block[] => {
  const config = modes[mode]
  const blocks: Block[] = []
  if (config.prompt) blocks.push({ type: "system", content: `<!-- prompt: ${config.prompt} -->` })
  blocks.push({ type: "system", content: `<!-- model: ${config.model} -->` })
  blocks.push({ type: "system", content: `<!-- reasoning: ${config.reasoning} -->` })
  blocks.push({ type: "system", content: `<!-- verbosity: ${config.verbosity} -->` })
  return blocks
}
