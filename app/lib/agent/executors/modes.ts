import type { AnyTool } from "./tool"
import type { Nudger } from "../steering/nudge-tools"
import type { Block } from "../types"
import {
  patchJsonBlock, applyLocalPatch, removeBlock,
  copyFile, renameFile, removeFile, runLocalShell,
  cancel,
  executeWithPlanTool,
  completeStep, completeSubstep,
  forEachTool,
  askTool,
} from "./tools"
import { createPlanTool } from "./tools"
import { baselineNudge } from "../steering/nudges/baseline"
import { buildToolNudges } from "../steering/nudges"
import { createMemoryNudge } from "../steering/nudges/memory"
import { createStepStateNudge } from "../steering/nudges/step-state"
import { createPlanProgressNudge } from "../steering/nudges/plan-progress"
import { getFiles } from "~/lib/files/store"

export type ModeConfig = {
  tools: AnyTool[]
  triggers: string[]
  prompt?: string
  nudges: Nudger[]
}

export type ModeName = "chat" | "plan" | "exec"

const toolNudges = buildToolNudges(getFiles)
const memoryNudge = createMemoryNudge(getFiles)
const stepStateNudge = createStepStateNudge(getFiles)
const planProgressNudge = createPlanProgressNudge(getFiles)

const resolveToolNudges = (tools: AnyTool[], nudges: Nudger[]): Nudger[] => {
  const fromTools = tools.flatMap((t) => toolNudges[t.name] ?? [])
  return [...nudges, ...fromTools]
}

const raw: Record<ModeName, ModeConfig> = {
  chat: {
    tools: [runLocalShell, patchJsonBlock, applyLocalPatch, removeBlock, copyFile, renameFile, removeFile, executeWithPlanTool, askTool],
    triggers: ["cancel"],
    nudges: [baselineNudge, memoryNudge],
  },
  plan: {
    tools: [runLocalShell, createPlanTool, cancel, askTool],
    triggers: ["execute_with_plan"],
    prompt: "planning",
    nudges: [baselineNudge, memoryNudge],
  },
  exec: {
    tools: [runLocalShell, patchJsonBlock, applyLocalPatch, removeBlock, copyFile, renameFile, removeFile, cancel, forEachTool, completeStep, completeSubstep],
    triggers: ["create_plan"],
    prompt: "execution",
    nudges: [baselineNudge, memoryNudge, stepStateNudge, planProgressNudge],
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

export const ENDPOINT = "/expert/qualitative-researcher?chat=true"

export const deriveMode = (blocks: Block[]): ModeName => {
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i]
    if (block.type === "tool_result" && block.toolName) {
      const mode = triggerToMode[block.toolName]
      if (mode) return mode
    }
  }
  return DEFAULT_MODE
}

export const buildModeResult = (mode: ModeName): string => {
  const config = modes[mode]
  const available = config.tools.map((t) => t.name).join(", ")
  return `Mode: ${mode}. Available tools: ${available}.`
}

export const hasUserSincePlanEntry = (blocks: Block[]): boolean => {
  let foundUser = false
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i]
    if (block.type === "user") foundUser = true
    if (block.type === "tool_result" && block.toolName === "execute_with_plan") return foundUser
  }
  return false
}
