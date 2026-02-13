import type { AnyTool } from "./tool"
import { patchJsonBlock } from "./json-patch"
import { applyLocalPatch } from "./patch"
import { removeBlock } from "./remove-block"
import { runLocalShell } from "./shell/tool"
import { orientate, reorient } from "./orientation"
import { resolve, reject } from "./reporting"
import { buildDelegateTool, orchestrateTool, forEachTool } from "./delegation-tools"

export type AgentDef = {
  path: string
  description: string
  chat: boolean
  tools: AnyTool[]
  proxy?: string[]
}

export const buildEndpoint = (agent: AgentDef, extra?: string): string => {
  const path = extra ? `${agent.path === "/" ? "" : agent.path}/${extra}` : agent.path
  return agent.chat ? `${path}?chat=true` : path
}

const baseTools: AnyTool[] = [
  runLocalShell,
  orientate,
  reorient,
  patchJsonBlock,
  applyLocalPatch,
  removeBlock,
  resolve,
  reject,
]

const baseAgents: Record<string, Omit<AgentDef, "tools">> = {
  orchestrator: {
    path: "/",
    description: "Coordinates experts, manages conversation flow",
    chat: true,
  },

  "qualitative-researcher/apply-codebook": {
    path: "/expert/qualitative-researcher/apply-codebook",
    description: "Apply codebook codes to content",
    chat: true,
  },
  "qualitative-researcher/apply-codebook/plan": {
    path: "/expert/qualitative-researcher/apply-codebook/plan",
    description: "Apply codebook codes to content (planning)",
    chat: true,
  },
  "qualitative-researcher/apply-codebook/exec": {
    path: "/expert/qualitative-researcher/apply-codebook/exec",
    description: "Apply codebook codes to content (executing)",
    chat: true,
  },
  "qualitative-researcher/apply-codebook/merge": {
    path: "/expert/qualitative-researcher/apply-codebook/merge",
    description: "Apply codebook codes to content (merging)",
    chat: true,
  },

  "qualitative-researcher/revise-codebook": {
    path: "/expert/qualitative-researcher/revise-codebook",
    description: "Revise codebook based on locally resolved codings",
    chat: true,
  },
  "qualitative-researcher/revise-codebook/plan": {
    path: "/expert/qualitative-researcher/revise-codebook/plan",
    description: "Revise codebook based on locally resolved codings (planning)",
    chat: true,
  },
  "qualitative-researcher/revise-codebook/exec": {
    path: "/expert/qualitative-researcher/revise-codebook/exec",
    description: "Revise codebook based on locally resolved codings (executing)",
    chat: true,
  },
  "qualitative-researcher/revise-codebook/merge": {
    path: "/expert/qualitative-researcher/revise-codebook/merge",
    description: "Revise codebook based on locally resolved codings (merging)",
    chat: true,
  },

  analyst: {
    path: "/expert/analyst",
    description: "Evaluates arguments, surfaces assumptions, applies frameworks",
    chat: true,
  },
  "analyst/plan": {
    path: "/expert/analyst/plan",
    description: "Evaluates arguments, surfaces assumptions, applies frameworks (planning)",
    chat: true,
  },
  "analyst/exec": {
    path: "/expert/analyst/exec",
    description: "Evaluates arguments, surfaces assumptions, applies frameworks (executing)",
    chat: true,
  },
  "analyst/merge": {
    path: "/expert/analyst/merge",
    description: "Evaluates arguments, surfaces assumptions, applies frameworks (merging)",
    chat: true,
  },
}

const isBaseExpert = (key: string): boolean =>
  key !== "orchestrator" && !key.endsWith("/plan") && !key.endsWith("/exec") && !key.endsWith("/merge")

const expertEntries = Object.entries(baseAgents)
  .filter(([k]) => isBaseExpert(k))
  .map(([k, a]) => ({ key: k, description: a.description }))

const delegateTool = buildDelegateTool(expertEntries)

const allTools: AnyTool[] = [...baseTools, delegateTool, orchestrateTool, forEachTool]

export const agents: Record<string, AgentDef> = Object.fromEntries(
  Object.entries(baseAgents).map(([k, a]) => [k, { ...a, tools: allTools }])
)
