import { z } from "zod"
import type { AnyTool } from "../../executors/tool"

export const StartPlanningArgs = z.object({
  task: z.string().describe("What you intend to plan — the user's request in your own words."),
})

export const startPlanTool: AnyTool = {
  name: "start_planning",
  description:
    "Start planning mode for work that applies a shared framework or analytical criteria, or requires sequential attention across sections. Do not use for bounded mechanical operations (rename, reformat, delete).\n\nparallel: no — mode transition, must be solo",
  schema: StartPlanningArgs,
}
