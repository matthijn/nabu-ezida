import type { AnyTool } from "./tool"
import { addAnnotation, markForDeletion, summarizeExpertise } from "./expert-tools"
import { patchJsonBlock } from "./json-patch"
import { applyLocalPatch } from "./patch"
import { runLocalShell } from "./shell/tool"
import { orientate, reorient, createPlan } from "./orchestration"

export type TaskConfig =
  | { description: string; tools: AnyTool[] }
  | { description: string; tools: AnyTool[]; proxy: string[] }

export type ExpertConfig = {
  description: string
  talk?: boolean
  tasks: Record<string, TaskConfig>
}

export type OrchestratorConfig = {
  endpoint: string
  talk: boolean
}

export const orchestrator: OrchestratorConfig = {
  endpoint: "/converse",
  talk: true,
}

export const experts: Record<string, ExpertConfig> = {
  "qualitative-researcher": {
    description: "Qualitative analysis specialist",
    tasks: {
      "apply-codebook": {
        description: "Apply codebook codes to content (uses annotation tools)",
        tools: [addAnnotation, markForDeletion, summarizeExpertise],
      },
      "revise-codebook": {
        description: "Revise codebook based on locally resolved codings (uses patch tools)",
        tools: [patchJsonBlock, applyLocalPatch, summarizeExpertise],
      },
    },
  },
  "analyst": {
    description: "Rigorous analytical reader—evaluates arguments, surfaces assumptions, applies frameworks to content",
    tasks: {},
  },
  "planner": {
    description: "Plans multi-step tasks given intent and constraints",
    tasks: {
      "plan": {
        description: "Create execution plan",
        tools: [runLocalShell, orientate, reorient, createPlan, summarizeExpertise],
        proxy: ["create_plan"],
      },
    },
  },
}
