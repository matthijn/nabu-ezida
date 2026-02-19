import type { AnyTool } from "./tool"
import type { Nudger } from "../steering/nudge-tools"
import {
  patchJsonBlock, applyLocalPatch, removeBlock,
  copyFile, renameFile, removeFile, runLocalShell,
  orientate, resolve, cancel,
  executeWithPlanTool, forEachTool,
  completeStep, completeSubstep,
} from "./tools"
import { baselineNudge } from "../steering/nudges/baseline"
import { buildToolNudges } from "../steering/nudges"
import { createMemoryNudge } from "../steering/nudges/memory"
import { createStepStateNudge } from "../steering/nudges/step-state"
import { createPlanProgressNudge } from "../steering/nudges/plan-progress"
import { getFiles } from "~/lib/files/store"

export type AgentDef = {
  path: string
  description: string
  interactive: boolean
  tools: AnyTool[]
  nudges: Nudger[]
  proxy?: string[]
}

export const BASE_AGENT = "qualitative-researcher"

export const buildEndpoint = (agent: AgentDef, extra?: string): string => {
  const path = extra ? `${agent.path === "/" ? "" : agent.path}/${extra}` : agent.path
  return agent.interactive ? `${path}?chat=true` : path
}

const toolNudges = buildToolNudges(getFiles)
const memoryNudge = createMemoryNudge(getFiles)
const stepStateNudge = createStepStateNudge(getFiles)
const planProgressNudge = createPlanProgressNudge(getFiles)

const resolveNudges = (tools: AnyTool[], nudges: Nudger[]): Nudger[] => {
  const fromTools = tools.flatMap((t) => toolNudges[t.name] ?? [])
  return [...nudges, ...fromTools]
}

const withToolNudges = (def: AgentDef): AgentDef => ({
  ...def,
  nudges: resolveNudges(def.tools, def.nudges),
})

const rawAgents: Record<string, AgentDef> = {
  "qualitative-researcher": {
    path: "/expert/qualitative-researcher",
    description: "Qualitative coding specialist — applies codebook codes to content, revises codebook definitions based on resolved codings",
    interactive: true,
    tools: [runLocalShell, orientate, patchJsonBlock, applyLocalPatch, removeBlock, copyFile, renameFile, removeFile, executeWithPlanTool, forEachTool],
    nudges: [baselineNudge, memoryNudge],
  },
  "qualitative-researcher/plan": {
    path: "/expert/qualitative-researcher/plan",
    description: "Qualitative coding (planning)",
    interactive: true,
    tools: [runLocalShell, resolve, cancel],
    nudges: [baselineNudge, memoryNudge],
  },
  "qualitative-researcher/orient": {
    path: "/expert/qualitative-researcher/orient",
    description: "Investigates questions by searching files",
    interactive: false,
    tools: [runLocalShell],
    nudges: [baselineNudge],
  },
  "qualitative-researcher/exec": {
    path: "/expert/qualitative-researcher/exec",
    description: "Qualitative coding (executing)",
    interactive: true,
    tools: [runLocalShell, orientate, patchJsonBlock, applyLocalPatch, removeBlock, copyFile, renameFile, removeFile, cancel, forEachTool, completeStep, completeSubstep],
    nudges: [baselineNudge, memoryNudge, stepStateNudge, planProgressNudge],
  },
  "qualitative-researcher/compact": {
    path: "/expert/qualitative-researcher/compact",
    description: "Qualitative coding (compacting)",
    interactive: false,
    tools: [],
    nudges: [baselineNudge],
  },
}

export const agents: Record<string, AgentDef> = Object.fromEntries(
  Object.entries(rawAgents).map(([k, a]) => [k, withToolNudges(a)])
)
