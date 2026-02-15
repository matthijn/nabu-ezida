import type { AnyTool } from "./tool"
import type { Nudger } from "../steering/nudge-tools"
import { patchJsonBlock } from "./json-patch"
import { applyLocalPatch } from "./patch"
import { removeBlock } from "./remove-block"
import { runLocalShell } from "./shell/tool"
import { orientate, reorient } from "./orientation"
import { resolve, reject } from "./reporting"
import { buildDelegateTool, executeWithPlanTool, forEachTool } from "./delegation-tools"
import { baselineNudge } from "../steering/nudges/baseline"
import { buildToolNudges } from "../steering/nudges"
import { planNudge } from "../steering/nudges/plan"
import { createMemoryNudge } from "../steering/nudges/memory"
import { identityNudge } from "../steering/nudges/identity"
import { getFiles } from "~/lib/files/store"

export type AgentDef = {
  path: string
  description: string
  chat: boolean
  delegate: boolean
  tools: AnyTool[]
  nudges: Nudger[]
  proxy?: string[]
}

export const buildEndpoint = (agent: AgentDef, extra?: string): string => {
  const path = extra ? `${agent.path === "/" ? "" : agent.path}/${extra}` : agent.path
  return agent.chat ? `${path}?chat=true` : path
}

const toolNudges = buildToolNudges(getFiles)
const memoryNudge = createMemoryNudge(getFiles)

const phases = ["plan", "exec", "merge"] as const

const isPhaseAgent = (key: string): boolean =>
  phases.some((p) => key.endsWith(`/${p}`))

const isDelegatableAgent = (key: string): boolean =>
  key !== "orchestrator" && !isPhaseAgent(key)

const deriveDelegatableExperts = (
  agents: Record<string, AgentDef>
): Array<{ key: string; description: string }> =>
  Object.entries(agents)
    .filter(([key]) => isDelegatableAgent(key))
    .map(([key, agent]) => ({ key, description: agent.description }))

const resolveNudges = (tools: AnyTool[], nudges: Nudger[]): Nudger[] => {
  const fromTools = tools.flatMap((t) => toolNudges[t.name] ?? [])
  return [...nudges, ...fromTools]
}

const withToolNudges = (def: AgentDef): AgentDef => ({
  ...def,
  nudges: resolveNudges(def.tools, def.nudges),
})

const agentsWithoutDelegation: Record<string, AgentDef> = {
  orchestrator: {
    path: "/",
    description: "Coordinates experts, manages conversation flow",
    chat: true,
    delegate: true,
    tools: [runLocalShell, orientate, reorient, patchJsonBlock, applyLocalPatch, removeBlock, forEachTool],
    nudges: [baselineNudge,memoryNudge, identityNudge("research assistant — handle simple non-domain tasks directly, delegate domain work to experts")],
  },

  "qualitative-researcher": {
    path: "/expert/qualitative-researcher",
    description: "Qualitative coding specialist — applies codebook codes to content, revises codebook definitions based on resolved codings",
    chat: true,
    delegate: false,
    tools: [runLocalShell, orientate, reorient, patchJsonBlock, applyLocalPatch, removeBlock, resolve, reject, executeWithPlanTool, forEachTool],
    nudges: [baselineNudge,memoryNudge, identityNudge("Qualitative coding specialist — applies codebook codes to content, revises codebook definitions based on resolved codings, for anything with some roughly known sequence use planning")],
  },
  "qualitative-researcher/plan": {
    path: "/expert/qualitative-researcher/plan",
    description: "Qualitative coding (planning)",
    chat: true,
    delegate: false,
    tools: [runLocalShell, orientate, reorient, applyLocalPatch, resolve, reject, forEachTool],
    nudges: [baselineNudge,planNudge, memoryNudge, identityNudge("Qualitative coding specialist — planning phase")],
  },
  "qualitative-researcher/exec": {
    path: "/expert/qualitative-researcher/exec",
    description: "Qualitative coding (executing)",
    chat: true,
    delegate: false,
    tools: [runLocalShell, orientate, reorient, patchJsonBlock, applyLocalPatch, removeBlock, resolve, reject, executeWithPlanTool, forEachTool],
    nudges: [baselineNudge,memoryNudge, identityNudge("Qualitative coding specialist — execution phase")],
  },
  "qualitative-researcher/merge": {
    path: "/expert/qualitative-researcher/merge",
    description: "Qualitative coding (merging)",
    chat: false,
    delegate: false,
    tools: [resolve, reject],
    nudges: [],
  },

  // analyst: {
  //   path: "/expert/analyst",
  //   description: "Evaluates arguments, surfaces assumptions, applies frameworks",
  //   chat: true,
  //   tools: [runLocalShell, orientate, reorient, patchJsonBlock, applyLocalPatch, removeBlock, resolve, reject, executeWithPlanTool, forEachTool],
  //   nudges: [baselineNudge, toneNudge],
  // },
  // "analyst/plan": {
  //   path: "/expert/analyst/plan",
  //   description: "Evaluates arguments, surfaces assumptions, applies frameworks (planning)",
  //   chat: true,
  //   tools: [runLocalShell, orientate, reorient, patchJsonBlock, applyLocalPatch, removeBlock, resolve, reject, executeWithPlanTool, forEachTool],
  //   nudges: [baselineNudge, toneNudge],
  // },
  // "analyst/exec": {
  //   path: "/expert/analyst/exec",
  //   description: "Evaluates arguments, surfaces assumptions, applies frameworks (executing)",
  //   chat: true,
  //   tools: [runLocalShell, orientate, reorient, patchJsonBlock, applyLocalPatch, removeBlock, resolve, reject, executeWithPlanTool, forEachTool],
  //   nudges: [baselineNudge, toneNudge],
  // },
  // "analyst/merge": {
  //   path: "/expert/analyst/merge",
  //   description: "Evaluates arguments, surfaces assumptions, applies frameworks (merging)",
  //   chat: true,
  //   tools: [runLocalShell, orientate, reorient, patchJsonBlock, applyLocalPatch, removeBlock, resolve, reject, executeWithPlanTool, forEachTool],
  //   nudges: [baselineNudge, toneNudge],
  // },
}

const delegateTool = buildDelegateTool(deriveDelegatableExperts(agentsWithoutDelegation))

const rawAgents: Record<string, AgentDef> = Object.fromEntries(
  Object.entries(agentsWithoutDelegation).map(([key, agent]) => [
    key,
    { ...agent, tools: agent.delegate ? [...agent.tools, delegateTool] : agent.tools },
  ])
)

export const agents: Record<string, AgentDef> = Object.fromEntries(
  Object.entries(rawAgents).map(([k, a]) => [k, withToolNudges(a)])
)
