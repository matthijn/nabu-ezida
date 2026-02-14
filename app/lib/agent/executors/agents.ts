import type { AnyTool } from "./tool"
import type { Nudger } from "../steering/nudge-tools"
import { patchJsonBlock } from "./json-patch"
import { applyLocalPatch } from "./patch"
import { removeBlock } from "./remove-block"
import { runLocalShell } from "./shell/tool"
import { orientate, reorient } from "./orientation"
import { resolve, reject } from "./reporting"
import { buildDelegateTool, orchestrateTool, forEachTool } from "./delegation-tools"
import { createOrientationNudge, orientationStartNudge } from "../steering/nudges/orientation"
import { baselineNudge } from "../steering/nudges/baseline"
import { shellNudge, grepNudge } from "../steering/nudges/shell"
import { toneNudge } from "../steering/nudges/tone"
import { getFiles } from "~/lib/files/store"

export type AgentDef = {
  path: string
  description: string
  chat: boolean
  tools: AnyTool[]
  nudges: Nudger[]
  proxy?: string[]
}

export const buildEndpoint = (agent: AgentDef, extra?: string): string => {
  const path = extra ? `${agent.path === "/" ? "" : agent.path}/${extra}` : agent.path
  return agent.chat ? `${path}?chat=true` : path
}

const orientationNudge = createOrientationNudge(getFiles)

const delegatableExperts = [
  { key: "qualitative-researcher/apply-codebook", description: "Apply codebook codes to content" },
  { key: "qualitative-researcher/revise-codebook", description: "Revise codebook based on locally resolved codings" },
  { key: "analyst", description: "Evaluates arguments, surfaces assumptions, applies frameworks" },
]

const delegateTool = buildDelegateTool(delegatableExperts)

const toolNudges: Record<string, Nudger[]> = {
  orientate: [orientationNudge, orientationStartNudge],
  run_local_shell: [shellNudge, grepNudge],
}

const resolveNudges = (tools: AnyTool[], nudges: Nudger[]): Nudger[] => {
  const fromTools = tools.flatMap((t) => toolNudges[t.name] ?? [])
  return [...nudges, ...fromTools]
}

type AgentInput = Omit<AgentDef, "nudges"> & { nudges: Nudger[] }

const withToolNudges = (def: AgentInput): AgentDef => ({
  ...def,
  nudges: resolveNudges(def.tools, def.nudges),
})

const rawAgents: Record<string, AgentInput> = {
  orchestrator: {
    path: "/",
    description: "Coordinates experts, manages conversation flow",
    chat: true,
    tools: [runLocalShell, orientate, reorient, patchJsonBlock, applyLocalPatch, removeBlock, resolve, reject, delegateTool, orchestrateTool, forEachTool],
    nudges: [baselineNudge, toneNudge],
  },

  "qualitative-researcher/apply-codebook": {
    path: "/expert/qualitative-researcher/apply-codebook",
    description: "Apply codebook codes to content",
    chat: true,
    tools: [runLocalShell, orientate, reorient, patchJsonBlock, applyLocalPatch, removeBlock, resolve, reject, delegateTool, orchestrateTool, forEachTool],
    nudges: [baselineNudge, toneNudge],
  },
  "qualitative-researcher/apply-codebook/plan": {
    path: "/expert/qualitative-researcher/apply-codebook/plan",
    description: "Apply codebook codes to content (planning)",
    chat: true,
    tools: [runLocalShell, orientate, reorient, patchJsonBlock, applyLocalPatch, removeBlock, resolve, reject, delegateTool, orchestrateTool, forEachTool],
    nudges: [baselineNudge, toneNudge],
  },
  "qualitative-researcher/apply-codebook/exec": {
    path: "/expert/qualitative-researcher/apply-codebook/exec",
    description: "Apply codebook codes to content (executing)",
    chat: true,
    tools: [runLocalShell, orientate, reorient, patchJsonBlock, applyLocalPatch, removeBlock, resolve, reject, delegateTool, orchestrateTool, forEachTool],
    nudges: [baselineNudge, toneNudge],
  },
  "qualitative-researcher/apply-codebook/merge": {
    path: "/expert/qualitative-researcher/apply-codebook/merge",
    description: "Apply codebook codes to content (merging)",
    chat: true,
    tools: [runLocalShell, orientate, reorient, patchJsonBlock, applyLocalPatch, removeBlock, resolve, reject, delegateTool, orchestrateTool, forEachTool],
    nudges: [baselineNudge, toneNudge],
  },

  "qualitative-researcher/revise-codebook": {
    path: "/expert/qualitative-researcher/revise-codebook",
    description: "Revise codebook based on locally resolved codings",
    chat: true,
    tools: [runLocalShell, orientate, reorient, patchJsonBlock, applyLocalPatch, removeBlock, resolve, reject, delegateTool, orchestrateTool, forEachTool],
    nudges: [baselineNudge, toneNudge],
  },
  "qualitative-researcher/revise-codebook/plan": {
    path: "/expert/qualitative-researcher/revise-codebook/plan",
    description: "Revise codebook based on locally resolved codings (planning)",
    chat: true,
    tools: [runLocalShell, orientate, reorient, patchJsonBlock, applyLocalPatch, removeBlock, resolve, reject, delegateTool, orchestrateTool, forEachTool],
    nudges: [baselineNudge, toneNudge],
  },
  "qualitative-researcher/revise-codebook/exec": {
    path: "/expert/qualitative-researcher/revise-codebook/exec",
    description: "Revise codebook based on locally resolved codings (executing)",
    chat: true,
    tools: [runLocalShell, orientate, reorient, patchJsonBlock, applyLocalPatch, removeBlock, resolve, reject, delegateTool, orchestrateTool, forEachTool],
    nudges: [baselineNudge, toneNudge],
  },
  "qualitative-researcher/revise-codebook/merge": {
    path: "/expert/qualitative-researcher/revise-codebook/merge",
    description: "Revise codebook based on locally resolved codings (merging)",
    chat: true,
    tools: [runLocalShell, orientate, reorient, patchJsonBlock, applyLocalPatch, removeBlock, resolve, reject, delegateTool, orchestrateTool, forEachTool],
    nudges: [baselineNudge, toneNudge],
  },

  analyst: {
    path: "/expert/analyst",
    description: "Evaluates arguments, surfaces assumptions, applies frameworks",
    chat: true,
    tools: [runLocalShell, orientate, reorient, patchJsonBlock, applyLocalPatch, removeBlock, resolve, reject, delegateTool, orchestrateTool, forEachTool],
    nudges: [baselineNudge, toneNudge],
  },
  "analyst/plan": {
    path: "/expert/analyst/plan",
    description: "Evaluates arguments, surfaces assumptions, applies frameworks (planning)",
    chat: true,
    tools: [runLocalShell, orientate, reorient, patchJsonBlock, applyLocalPatch, removeBlock, resolve, reject, delegateTool, orchestrateTool, forEachTool],
    nudges: [baselineNudge, toneNudge],
  },
  "analyst/exec": {
    path: "/expert/analyst/exec",
    description: "Evaluates arguments, surfaces assumptions, applies frameworks (executing)",
    chat: true,
    tools: [runLocalShell, orientate, reorient, patchJsonBlock, applyLocalPatch, removeBlock, resolve, reject, delegateTool, orchestrateTool, forEachTool],
    nudges: [baselineNudge, toneNudge],
  },
  "analyst/merge": {
    path: "/expert/analyst/merge",
    description: "Evaluates arguments, surfaces assumptions, applies frameworks (merging)",
    chat: true,
    tools: [runLocalShell, orientate, reorient, patchJsonBlock, applyLocalPatch, removeBlock, resolve, reject, delegateTool, orchestrateTool, forEachTool],
    nudges: [baselineNudge, toneNudge],
  },
}

export const agents: Record<string, AgentDef> = Object.fromEntries(
  Object.entries(rawAgents).map(([k, a]) => [k, withToolNudges(a)])
)
