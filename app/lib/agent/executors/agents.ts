import type { AnyTool } from "./tool"
import type { Nudger } from "../steering/nudge-tools"
import { patchJsonBlock } from "./json-patch"
import { applyLocalPatch } from "./patch"
import { removeBlock } from "./remove-block"
import { copyFile, renameFile, removeFile } from "./file-ops"
import { runLocalShell } from "./shell/tool"
import { orientate, reorient } from "./orientation"
import { resolve, reject } from "./reporting"
import { executeWithPlanTool, forEachTool } from "./delegation-tools"
import { completeStep, completeSubstep, abortPlan } from "./reporting"
import { baselineNudge } from "../steering/nudges/baseline"
import { buildToolNudges } from "../steering/nudges"
import { createMemoryNudge } from "../steering/nudges/memory"
import { createStepStateNudge } from "../steering/nudges/step-state"
import { createPlanProgressNudge } from "../steering/nudges/plan-progress"
import { getFiles } from "~/lib/files/store"

export type AgentDef = {
  path: string
  description: string
  chat: boolean
  tools: AnyTool[]
  nudges: Nudger[]
  proxy?: string[]
}

export const BASE_AGENT = "qualitative-researcher"

export const buildEndpoint = (agent: AgentDef, extra?: string): string => {
  const path = extra ? `${agent.path === "/" ? "" : agent.path}/${extra}` : agent.path
  return agent.chat ? `${path}?chat=true` : path
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
    chat: true,
    tools: [runLocalShell, orientate, reorient, patchJsonBlock, applyLocalPatch, removeBlock, copyFile, renameFile, removeFile, executeWithPlanTool, forEachTool],
    nudges: [baselineNudge, memoryNudge],
  },
  "qualitative-researcher/plan": {
    path: "/expert/qualitative-researcher/plan",
    description: "Qualitative coding (planning)",
    chat: true,
    tools: [runLocalShell, resolve, reject],
    nudges: [baselineNudge, memoryNudge],
  },
  "qualitative-researcher/exec": {
    path: "/expert/qualitative-researcher/exec",
    description: "Qualitative coding (executing)",
    chat: true,
    tools: [runLocalShell, orientate, reorient, patchJsonBlock, applyLocalPatch, removeBlock, copyFile, renameFile, removeFile, resolve, reject, executeWithPlanTool, forEachTool, completeStep, completeSubstep, abortPlan],
    nudges: [baselineNudge, memoryNudge, stepStateNudge, planProgressNudge],
  },
  "qualitative-researcher/merge": {
    path: "/expert/qualitative-researcher/merge",
    description: "Qualitative coding (merging)",
    chat: false,
    tools: [resolve, reject],
    nudges: [baselineNudge],
  },
  "qualitative-researcher/memory": {
    path: "/expert/qualitative-researcher/memory",
    description: "Memory update",
    chat: false,
    tools: [applyLocalPatch, resolve, reject],
    nudges: [baselineNudge, memoryNudge],
  },
}

export const agents: Record<string, AgentDef> = Object.fromEntries(
  Object.entries(rawAgents).map(([k, a]) => [k, withToolNudges(a)])
)
