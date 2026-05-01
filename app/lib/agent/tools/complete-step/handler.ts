import type { Block } from "../../client"
import { pushBlocks, getAllBlocks } from "../../client"
import { derive } from "../../derived"
import { tool, registerTool, ok } from "../../executors/tool"
import { completeStep as def } from "./def"

const toSystemBlock = (content: string): Block => ({ type: "system", content })

type StepKind = "final" | "checkpoint" | "continue"

const classifyStep = (): StepKind => {
  const { plans } = derive(getAllBlocks())
  const plan = plans.at(-1)
  if (!plan || plan.currentStep === null) return "continue"
  if (plan.currentStep === plan.steps.length - 1) return "final"
  if (plan.steps[plan.currentStep].checkpoint) return "checkpoint"
  return "continue"
}

const STEP_INSTRUCTION: Record<StepKind, string> = {
  final:
    "Plan complete. If a research question exists, map what was found to what was asked — which parts of the question got evidence, which got none. Do not answer the research question. Report and stop. Make no tool calls.",
  checkpoint:
    "Speak only — write one sentence that you are waiting for confirmation. Make no tool calls.",
  continue: "Do not write — make your next tool call immediately.",
}

const _completeStep = registerTool(
  tool({
    ...def,
    handler: async (_files, args) => {
      pushBlocks([toSystemBlock(STEP_INSTRUCTION[classifyStep()])])
      return ok(args)
    },
  })
)
