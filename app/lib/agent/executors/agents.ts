import type { AnyTool } from "./tool"
import { addAnnotation, markForDeletion, summarizeExpertise } from "./expert-tools"
import { patchJsonBlock } from "./json-patch"
import { applyLocalPatch } from "./patch"
import { removeBlock } from "./remove-block"
import { runLocalShell } from "./shell/tool"
import { createPlan, completeStep, abort, orientate, reorient } from "./orchestration"

export type AgentDef = {
  path: string
  description: string
  chat: boolean
  tools: AnyTool[]
  proxy?: string[]
}

export const buildEndpoint = (agent: AgentDef, extra?: string): string => {
  const params = new URLSearchParams()
  if (agent.chat) params.set("chat", "true")
  if (extra) params.set("extra", extra)
  const qs = params.toString()
  return qs ? `${agent.path}?${qs}` : agent.path
}

export const agents: Record<string, AgentDef> = {
  orchestrator: {
    path: "/",
    description: "Coordinates experts, manages conversation flow",
    chat: true,
    tools: [
        runLocalShell,
      createPlan,
      completeStep,
      abort,
      orientate,
      reorient,
      patchJsonBlock,
      applyLocalPatch,
      removeBlock],
  },

  "qualitative-researcher/apply-codebook": {
    path: "/expert/qualitative-researcher/apply-codebook",
    description: "Apply codebook codes to content (uses annotation tools)",
    chat: true,
    tools: [addAnnotation, markForDeletion, summarizeExpertise],
  },

  "qualitative-researcher/revise-codebook": {
    path: "/expert/qualitative-researcher/revise-codebook",
    description: "Revise codebook based on locally resolved codings (uses patch tools)",
    chat: true,
    tools: [patchJsonBlock, applyLocalPatch, summarizeExpertise],
  },

  analyst: {
    path: "/expert/analyst",
    description: "Evaluates arguments, surfaces assumptions, applies frameworks",
    chat: true,
    tools: [],
  },
}
