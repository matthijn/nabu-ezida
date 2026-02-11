import type { AnyTool } from "./tool"
import { patchJsonBlock } from "./json-patch"
import { applyLocalPatch } from "./patch"
import { removeBlock } from "./remove-block"
import { runLocalShell } from "./shell/tool"
import { orientate, reorient } from "./orientation"

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

const allTools: AnyTool[] = [
  runLocalShell,
  orientate,
  reorient,
  patchJsonBlock,
  applyLocalPatch,
  removeBlock,
]

export const agents: Record<string, AgentDef> = {
  orchestrator: {
    path: "/",
    description: "Coordinates experts, manages conversation flow",
    chat: true,
    tools: allTools,
  },

  "qualitative-researcher/apply-codebook": {
    path: "/expert/qualitative-researcher/apply-codebook",
    description: "Apply codebook codes to content",
    chat: true,
    tools: allTools,
  },
  "qualitative-researcher/apply-codebook/plan": {
    path: "/expert/qualitative-researcher/apply-codebook/plan",
    description: "Apply codebook codes to content (planning)",
    chat: true,
    tools: allTools,
  },
  "qualitative-researcher/apply-codebook/exec": {
    path: "/expert/qualitative-researcher/apply-codebook/exec",
    description: "Apply codebook codes to content (executing)",
    chat: true,
    tools: allTools,
  },

  "qualitative-researcher/revise-codebook": {
    path: "/expert/qualitative-researcher/revise-codebook",
    description: "Revise codebook based on locally resolved codings",
    chat: true,
    tools: allTools,
  },
  "qualitative-researcher/revise-codebook/plan": {
    path: "/expert/qualitative-researcher/revise-codebook/plan",
    description: "Revise codebook based on locally resolved codings (planning)",
    chat: true,
    tools: allTools,
  },
  "qualitative-researcher/revise-codebook/exec": {
    path: "/expert/qualitative-researcher/revise-codebook/exec",
    description: "Revise codebook based on locally resolved codings (executing)",
    chat: true,
    tools: allTools,
  },

  analyst: {
    path: "/expert/analyst",
    description: "Evaluates arguments, surfaces assumptions, applies frameworks",
    chat: true,
    tools: allTools,
  },
  "analyst/plan": {
    path: "/expert/analyst/plan",
    description: "Evaluates arguments, surfaces assumptions, applies frameworks (planning)",
    chat: true,
    tools: allTools,
  },
  "analyst/exec": {
    path: "/expert/analyst/exec",
    description: "Evaluates arguments, surfaces assumptions, applies frameworks (executing)",
    chat: true,
    tools: allTools,
  },
}
